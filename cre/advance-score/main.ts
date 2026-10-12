/**
 * Advance scoring as a Chainlink CRE workflow.
 *
 * Every DON node fetches the borrower's score from the Advance scoring API (onchain income via
 * Envio HyperSync, payer checks via Nansen), the DON agrees on the limit (median), and the signed
 * report is written to CreditLine.onReport through the CRE forwarder. No single server key sets limits.
 */
import {
	consensusMedianAggregation,
	CronCapability,
	EVMClient,
	getNetwork,
	handler,
	HTTPClient,
	type HTTPSendRequester,
	ok,
	prepareReportRequest,
	Runner,
	type Runtime,
	text,
	TxStatus,
} from '@chainlink/cre-sdk'
import { encodeAbiParameters, parseAbiParameters, type Address } from 'viem'
import { z } from 'zod'

const configSchema = z.object({
	schedule: z.string(),
	scoreApi: z.string(), // e.g. https://advance.example/api/score?address=
	borrowers: z.array(z.string()),
	evm: z.object({
		chainSelectorName: z.string(),
		creditLine: z.string(),
		gasLimit: z.string(),
	}),
})
type Config = z.infer<typeof configSchema>

/** Runs on each node: the limit (in AUSD micro-units) this node's scoring call returns. */
const fetchLimit = (requester: HTTPSendRequester, url: string) => {
	const res = requester.sendRequest({ url, method: 'GET' }).result()
	if (!ok(res)) throw new Error(`score API returned ${res.statusCode}`)
	const s = JSON.parse(text(res)) as { approved: boolean; limit: number }
	return s.approved ? Math.round(s.limit * 1e6) : 0
}

const onCron = (runtime: Runtime<Config>) => {
	const { evm, borrowers, scoreApi } = runtime.config
	const network = getNetwork({ chainFamily: 'evm', chainSelectorName: evm.chainSelectorName, isTestnet: evm.chainSelectorName.includes('testnet') })
	if (!network) throw new Error(`Unknown chain ${evm.chainSelectorName}`)
	const client = new EVMClient(network.chainSelector.selector)
	const http = new HTTPClient()
	const written: string[] = []

	for (const borrower of borrowers) {
		const limit = http.sendRequest(runtime, fetchLimit, consensusMedianAggregation())(scoreApi + borrower).result()
		runtime.log(`borrower ${borrower}: DON-agreed limit ${limit / 1e6} AUSD`)

		// CreditLine.onReport decodes (address borrower, uint256 limit)
		const payload = encodeAbiParameters(parseAbiParameters('address, uint256'), [borrower as Address, BigInt(limit)])
		const report = runtime.report(prepareReportRequest(payload)).result()
		const resp = client.writeReport(runtime, { receiver: evm.creditLine, report, gasConfig: { gasLimit: evm.gasLimit } }).result()
		if (resp.txStatus !== TxStatus.SUCCESS) throw new Error(`write failed: ${resp.errorMessage || resp.txStatus}`)
		const hash = resp.txHash ? `0x${Array.from(resp.txHash, (b) => b.toString(16).padStart(2, '0')).join('')}` : 'n/a'
		runtime.log(`limit written onchain: ${hash}`)
		written.push(hash)
	}
	return written.join(',')
}

const initWorkflow = (config: Config) => [handler(new CronCapability().trigger({ schedule: config.schedule }), onCron)]

export async function main() {
	const runner = await Runner.newRunner<Config>({ configSchema })
	await runner.run(initWorkflow)
}

main()

/**
 * Turns raw errors (viem, RPC, HyperSync, fetch) into one plain sentence a person can act on.
 * Used by the shared error box in the browser and by every API route, so no page shows request
 * bodies, hex, URLs or stack-ish text.
 */
const RULES: [RegExp, string][] = [
  [/transfer amount exceeds balance|ERC20InsufficientBalance/i, "You don't have enough dollars for this. Get test dollars first, then try again."],
  [/user rejected|user denied|NotAllowedError|cancel+ed|aborted by the user/i, "You cancelled the request. Nothing was sent."],
  [/insufficient funds|exceeds (the )?balance|not enough (balance|funds)|total cost .* exceeds/i, "Your account doesn't have enough to cover this yet. Add test dollars or wait a moment for network fees to arrive, then try again."],
  [/allowance|ERC20InsufficientAllowance/i, "The approval didn't go through in time. Please try again."],
  [/OverLimit/i, "That's more than your limit allows right now."],
  [/IsDefaulted/i, "This account has a missed repayment on record, so new advances are paused."],
  [/UtilisationCap|utili[sz]ation/i, "The savings pool is lending as much as it safely can right now. Try a smaller amount or try later."],
  [/NotOverdue/i, "This advance isn't overdue yet."],
  [/Missing or invalid parameters|invalid params|nonce too (low|high)|replacement transaction|already known/i, "The network didn't accept the transaction just now. Please try again in a few seconds."],
  [/reverted|execution reverted|ContractFunctionRevertedError/i, "The transaction was rejected by the contract. Nothing was charged except a tiny network fee."],
  [/returned no data|contract function .* returned no data|is not a contract/i, "This part of Advance isn't available on this network yet."],
  [/HyperSync 429|history service is busy|rate.?limit|429|too many requests/i, "Loading history is busy right now. It will refresh by itself in a few seconds."],
  [/timeout|timed out|took too long/i, "The network is slow right now. Please try again."],
  [/Failed to fetch|NetworkError|ECONNREFUSED|fetch failed|network request failed/i, "Can't reach the server. Check your connection and try again."],
  [/isn't set up to send transactions|SERVER_PRIVATE_KEY/i, "This server isn't set up to send transactions yet."],
  [/ENVIO_API_TOKEN/i, "History can't be loaded on this server yet."],
  [/passkey|WebAuthn|PRF/i, "Your device couldn't use a passkey here. Try another browser or use the temporary demo account."],
];

export function plainError(raw: unknown): string {
  const msg = raw instanceof Error ? (raw as { shortMessage?: string }).shortMessage ?? raw.message : String(raw ?? "");
  for (const [re, text] of RULES) if (re.test(msg)) return text;
  // Already a short, human sentence from our own API (e.g. "Invalid address"): keep it.
  const first = msg.split("\n")[0].trim();
  if (first && first.length <= 120 && !/0x[0-9a-f]{10,}|https?:\/\/|\{|\}|Request (body|Arguments)|Docs:|Version:/i.test(first)) return first;
  return "Something went wrong. Please try again.";
}

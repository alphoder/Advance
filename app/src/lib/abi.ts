import { parseAbi } from "viem";

export const erc20Abi = parseAbi([
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "function balanceOf(address) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function totalSupply() view returns (uint256)",
]);

export const ausdAbi = parseAbi([
  "function faucet(address to, uint256 amount)",
  "function DOMAIN_SEPARATOR() view returns (bytes32)",
  "function transferWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s)",
]);

export const poolAbi = parseAbi([
  "event Deposit(address indexed lender, uint8 tranche, uint256 assets, uint256 shares)",
  "event Withdraw(address indexed lender, uint8 tranche, uint256 assets, uint256 shares)",
  "event RepaymentReceived(uint256 principal, uint256 fee, uint256 seniorFee, uint256 juniorFee, uint256 protocolFee)",
  "event WrittenOff(uint256 amount, uint256 juniorLoss, uint256 seniorLoss)",
  "function deposit(uint8 t, uint256 assets) returns (uint256)",
  "function withdraw(uint8 t, uint256 shares) returns (uint256)",
  "function seniorAssets() view returns (uint256)",
  "function juniorAssets() view returns (uint256)",
  "function outstanding() view returns (uint256)",
  "function totalAssets() view returns (uint256)",
  "function totalFeesEarned() view returns (uint256)",
  "function totalLosses() view returns (uint256)",
  "function utilisationBps() view returns (uint256)",
  "function sharePrice(uint8 t) view returns (uint256)",
]);

export const creditAbi = parseAbi([
  "struct Credit { uint128 limit; uint128 principal; uint128 fee; uint128 totalBorrowed; uint128 totalRepaid; uint64 lastDraw; uint32 repayments; uint8 tier; bool defaulted; }",
  "event LimitSet(address indexed borrower, uint256 limit, uint8 tier)",
  "event Drawn(address indexed borrower, uint256 amount, uint256 fee)",
  "event Repaid(address indexed borrower, address indexed payer, uint256 principal, uint256 fee)",
  "event TierUp(address indexed borrower, uint8 tier)",
  "event Defaulted(address indexed borrower, uint256 principalLost)",
  "function creditOf(address) view returns (Credit)",
  "function owed(address) view returns (uint256)",
  "function available(address) view returns (uint256)",
  "function draw(uint256 amount)",
  "function repay(address borrower, uint256 amount) returns (uint256)",
  "function setLimit(address borrower, uint256 limit)",
  "function tierCaps(uint256) view returns (uint128)",
]);

export const factoryAbi = parseAbi([
  "function open(address borrower) returns (address)",
  "function predict(address borrower) view returns (address)",
  "function accountOf(address) view returns (address)",
]);

export const receivablesAbi = parseAbi([
  "event PaymentSplit(address indexed payer, uint256 amount, uint256 repaid, uint256 toBorrower)",
  "function sweep()",
  "function shareBps() view returns (uint256)",
  "function payWithAuthorization(address from, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s)",
]);

export const Tranche = { Steady: 0, Boost: 1 } as const;

/** EIP-3009 typed data for AUSD-style tokens. */
export const receiveAuthTypes = {
  ReceiveWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
} as const;

export const transferAuthTypes = {
  TransferWithAuthorization: receiveAuthTypes.ReceiveWithAuthorization,
} as const;

export const creditFilesAbi = parseAbi([
  "event EncryptionKey(address indexed owner, bytes pubkey)",
  "event FilePublished(address indexed owner, bytes32 indexed id, string name, bytes blob)",
  "event AccessGranted(address indexed owner, bytes32 indexed id, address indexed lender, bytes wrappedKey)",
  "function setEncryptionKey(bytes pubkey)",
  "function publish(bytes32 id, string name, bytes blob)",
  "function grant(bytes32 id, address lender, bytes wrappedKey)",
]);

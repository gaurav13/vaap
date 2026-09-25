export type XrplNetwork = "mainnet" | "testnet"

/** Active network. Defaults to testnet so nothing touches real XRP unless explicitly configured. */
export function getXrplNetwork(): XrplNetwork {
  return process.env.XRPL_NETWORK?.trim().toLowerCase() === "mainnet" ? "mainnet" : "testnet"
}

export const XRPL_NETWORK: XrplNetwork = getXrplNetwork()

export function networkLabel(network: string | null | undefined = XRPL_NETWORK): string {
  return network === "mainnet" ? "Mainnet" : "Testnet"
}

/** Explorer URL for a tx. Pass the network stored on the record so historic testnet links stay correct. */
export function explorerUrl(hash: string, network: string | null | undefined = XRPL_NETWORK): string {
  const host = network === "mainnet" ? "livenet.xrpl.org" : "testnet.xrpl.org"
  return `https://${host}/transactions/${hash}`
}

export function accountExplorerUrl(address: string, network: string | null | undefined = XRPL_NETWORK): string {
  const host = network === "mainnet" ? "livenet.xrpl.org" : "testnet.xrpl.org"
  return `https://${host}/accounts/${address}`
}

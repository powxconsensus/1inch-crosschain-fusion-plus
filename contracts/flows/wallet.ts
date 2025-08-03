import { ethers } from "ethers";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { ChainConfig, ChainType } from "./config/chains";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";

export function getProvider(
  chainConfig: ChainConfig
): ethers.Provider | SuiClient {
  if (chainConfig.type === ChainType.EVM) {
    return new ethers.JsonRpcProvider(chainConfig.rpc);
  }
  const rpcUrl = getFullnodeUrl(
    chainConfig.chainId == "sui-testnet" ? "testnet" : "mainnet"
  );

  return new SuiClient({ url: rpcUrl });
}

export function getPrivateKey(role: "maker" | "taker"): string {
  const key =
    role === "maker"
      ? process.env.MAKER_PRIVATE_KEY
      : process.env.TAKER_PRIVATE_KEY;
  if (!key) {
    throw new Error(
      `${role.toUpperCase()}_PRIVATE_KEY environment variable is required`
    );
  }
  return key;
}

export function getEvmWallet(
  role: "maker" | "taker",
  provider: ethers.Provider
): ethers.Wallet {
  const privateKey = getPrivateKey(role);
  return new ethers.Wallet(privateKey, provider);
}

export function getSuiWallet(role: "maker" | "taker"): Ed25519Keypair {
  const privateKey = getPrivateKey(role);
  return Ed25519Keypair.fromSecretKey(
    ethers.getBytes(
      privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`
    )
  );
}

export interface TokenConfig {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  chain: string;
}

export interface ChainTokens {
  [network: string]: TokenConfig[];
}

export interface Tokens {
  evm: ChainTokens;
  sui: ChainTokens;
}

export const tokens: Tokens = {
  evm: {
    sepolia: [
      {
        symbol: "ETH",
        name: "Ethereum",
        address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        decimals: 18,
        chain: "sepolia",
      },
      {
        symbol: "USDC",
        name: "USD Coin",
        address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
        decimals: 6,
        chain: "sepolia",
      },
      {
        symbol: "USDT",
        name: "Tether USD",
        address: "0x04b866D0027c3e352d2C8E2046b83d4b595d6dF9",
        decimals: 6,
        chain: "sepolia",
      },
    ],
    fuji: [
      {
        symbol: "AVAX",
        name: "Avalanche",
        address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        decimals: 18,
        chain: "avalanche",
      },
      {
        symbol: "USDC",
        name: "USD Coin",
        address: "0x5425890298aed601595a70AB815c96711a31Bc65",
        decimals: 6,
        chain: "avalanche",
      },
      {
        symbol: "USDT",
        name: "Tether USD",
        address: "0xf85C516579E97f0744917f0C8A0Ffc6aca98283d",
        decimals: 6,
        chain: "avalanche",
      },
    ],
  },
  sui: {
    testnet: [
      {
        symbol: "SUI",
        name: "Sui",
        address:
          "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI",
        decimals: 9,
        chain: "sui",
      },
      {
        symbol: "USDC",
        name: "USD Coin",
        address:
          "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf",
        decimals: 6,
        chain: "sui",
      },
      {
        symbol: "USDT",
        name: "Tether USD",
        address:
          "0x2d624c909e7f2c9483642d68240615ba2f8cce66591b9e03c6d6ea721a5d2d19",
        decimals: 6,
        chain: "sui",
      },
    ],
  },
};

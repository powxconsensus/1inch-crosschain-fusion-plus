const tokens = {
  "43113": {
    "0xf85C516579E97f0744917f0C8A0Ffc6aca98283d": {
      name: "USDT",
      symbol: "USDT",
      decimals: 6,
    },
    "0x5425890298aed601595a70AB815c96711a31Bc65": {
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
    },
  },
  "11155111": {
    "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee": {
      name: "ETH",
      symbol: "ETH",
      decimals: 18,
    },
    "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238": {
      name: "USDC",
      symbol: "USDC",
      decimals: 6,
    },
    "0x04b866D0027c3e352d2C8E2046b83d4b595d6dF9": {
      name: "USDT",
      symbol: "USDT",
      decimals: 6,
    },
  },
  "sui-testnet": {
    "0x2d624c909e7f2c9483642d68240615ba2f8cce66591b9e03c6d6ea721a5d2d19": {
      name: "USDT",
      symbol: "USDT",
      decimals: 6,
    },
  },
};

export const getTokenInfo = (chainId: string, tokenAddress: string) => {
  return tokens[chainId as keyof typeof tokens][tokenAddress];
};

export const getTokenInfoFromSymbol = (chainId: string, symbol: string) => {
  const token = Object.values(tokens[chainId as keyof typeof tokens]).find(
    (token) => token.symbol === symbol
  );
  if (!token) throw new Error(`Token ${symbol} not found`);
  return token;
};

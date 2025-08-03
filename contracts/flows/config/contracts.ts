export const contracts: Record<
  string,
  { escrowFactory: string; accessToken: string }
> = {
  "43113": {
    escrowFactory: "0x3505f1e9Fc7Ea5De03867617454B459272965c86",
    accessToken: "0x9854aFe4b9f0f87432A244E1f59709300Bc3Fc1d",
  },
  "11155111": {
    escrowFactory: "0x5dd45E5C4F8cC9eF4102A4b59cD8C99dc179dCDf",
    accessToken: "0x80d92BabA2E9C1aC7064ce92917a6970aC335251",
  },
  "sui-testnet": {
    escrowFactory:
      "0x77534544bcd66099015d83854c9e604370ae872e93550be4f0f842573c81353340abe5db3ccc11e0ae96910f5652a0cf53131354c113bb5b7b7de7ffbd30d519",
    accessToken: "",
  },
};

export const getContractAddress = (chainId: string, contractName: string) => {
  return contracts[chainId as keyof typeof contracts][
    contractName as keyof (typeof contracts)[keyof typeof contracts]
  ];
};

import { ethers } from "ethers";
import {
  abi as EscrowFactoryAbi,
  bytecode as EscrowFactoryBytecode,
} from "../../evm/out/EscrowFactory.sol/EscrowFactory.json";
import {
  abi as AccessTokenAbi,
  bytecode as AccessTokenBytecode,
} from "../../evm/out/AccessToken.sol/AccessToken.json";
import dotenv from "dotenv";
import global from "../../../global/config.json";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { networks } from "../config/networks";

dotenv.config();

// ts-node ./scripts/deploy.ts --network "sepolia" --accessTokenAddress 0x80d92BabA2E9C1aC7064ce92917a6970aC335251
// ts-node ./scripts/deploy.ts --network "sepolia"
// ts-node ./scripts/deploy.ts --network "fuji" --accessTokenAddress 0x7E187bA0F0D4d4112a9ed9eB6d9a73c6749DbA2c
(async () => {
  const argv = await yargs(hideBin(process.argv))
    .option("network", {
      alias: "n",
      description: "Select network to deploy to",
      type: "string",
      choices: [...Object.keys(networks.evm), ...Object.keys(networks.sui)],
      demandOption: true,
    })
    .option("accessTokenAddress", {
      alias: "at",
      description: "Select access token address to deploy to",
      type: "string",
      demandOption: false,
    })
    .help().argv;

  const network = networks.evm[argv.network as keyof typeof networks.evm];
  let accessTokenAddress = argv.accessTokenAddress;

  if (!process.env.PRIVATE_KEY || !network.rpc) {
    throw new Error("Please set PRIVATE_KEY");
  }

  const wallet = new ethers.Wallet(
    process.env.PRIVATE_KEY,
    new ethers.JsonRpcProvider(network.rpc)
  );

  const EscrowFactory = new ethers.ContractFactory(
    EscrowFactoryAbi,
    EscrowFactoryBytecode,
    wallet
  );
  const AccessTokenFactory = new ethers.ContractFactory(
    AccessTokenAbi,
    AccessTokenBytecode,
    wallet
  );
  if (!accessTokenAddress) {
    const accessToken = await AccessTokenFactory.deploy(wallet.address);
    const accessTokenResponse = await accessToken.waitForDeployment();
    accessTokenAddress = await accessTokenResponse.getAddress();
  }

  const ef = await EscrowFactory.deploy(
    accessTokenAddress,
    global.rescueDelaySrc,
    global.rescueDelayDst,
    {
      nonce: await wallet.getNonce("latest"),
    }
  );
  const escrowFactory = await ef.waitForDeployment();
  console.log("AccessToken: ", accessTokenAddress);
  console.log("EscrowFactory: ", await escrowFactory.getAddress());
})();

import { ethers } from "ethers";
import {
  abi as EscrowFactoryAbi,
  bytecode as EscrowFactoryBytecode,
} from "../../../evm/out/EscrowFactory.sol/EscrowFactory.json";
import {
  abi as AccessTokenAbi,
  bytecode as AccessTokenBytecode,
} from "../../../evm/out/AccessToken.sol/AccessToken.json";
import global from "../../../../global/config.json";
import { networks } from "../../config/networks";

interface DeployArgs {
  network: string;
  accessTokenAddress?: string;
}

export async function deployEVM(args: DeployArgs): Promise<void> {
  const network = networks.evm[args.network];
  if (!network) {
    throw new Error(`Network ${args.network} not supported`);
  }

  if (!process.env.PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY environment variable is required");
  }

  console.log(`Deploying to ${args.network}...`);

  const wallet = new ethers.Wallet(
    process.env.PRIVATE_KEY,
    new ethers.JsonRpcProvider(network.rpc)
  );

  let accessTokenAddress = args.accessTokenAddress;

  // Deploy AccessToken if address not provided
  if (!accessTokenAddress) {
    console.log("Deploying AccessToken...");
    const AccessTokenFactory = new ethers.ContractFactory(
      AccessTokenAbi,
      AccessTokenBytecode,
      wallet
    );
    const accessToken = await AccessTokenFactory.deploy(wallet.address);
    const accessTokenResponse = await accessToken.waitForDeployment();
    accessTokenAddress = await accessTokenResponse.getAddress();
    console.log("AccessToken deployed at:", accessTokenAddress);
  }

  // Deploy EscrowFactory
  console.log("Deploying EscrowFactory...");
  const EscrowFactory = new ethers.ContractFactory(
    EscrowFactoryAbi,
    EscrowFactoryBytecode,
    wallet
  );

  const ef = await EscrowFactory.deploy(
    accessTokenAddress,
    global.rescueDelaySrc,
    global.rescueDelayDst,
    {
      nonce: await wallet.getNonce("latest"),
    }
  );

  const escrowFactory = await ef.waitForDeployment();
  const escrowFactoryAddress = await escrowFactory.getAddress();

  console.log("\nDeployment Summary:");
  console.log("------------------");
  console.log("Network:", args.network);
  console.log("AccessToken:", accessTokenAddress);
  console.log("EscrowFactory:", escrowFactoryAddress);
}

import { networks } from "../../config/networks";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
const { Ed25519Keypair } = require("@mysten/sui/keypairs/ed25519");
import { Transaction } from "@mysten/sui/transactions";
import global from "../../config/global";
import {
  bech32PrivateKeyToHex,
  findObjectId,
  publishPackage,
  signAndSendTx,
} from "../../helper/sui/utils";
import { getBytes, sleep } from "../../helper/utils";
import { DeploymentInfo } from "../../config/types";

interface DeployArgs {
  network: string;
  accessTokenAddress?: string;
}

export async function deploySui(args: DeployArgs): Promise<void> {
  const network = networks.sui[args.network];
  if (!network) {
    throw new Error(`Network ${args.network} not supported`);
  }

  let private_key = process.env.PRIVATE_KEY;
  if (!private_key) {
    throw new Error("PRIVATE_KEY environment variable is required");
  }

  if (private_key.startsWith("suiprivkey"))
    private_key = bech32PrivateKeyToHex(private_key);

  const rpcUrl = getFullnodeUrl(
    args.network == "testnet" ? "testnet" : "mainnet"
  );

  const client = new SuiClient({ url: rpcUrl });
  const deployer = Ed25519Keypair.fromSecretKey(
    getBytes(private_key.startsWith("0x") ? private_key : `0x${private_key}`)
  );

  console.log(`Deploying to Sui ${args.network}...`);

  // Deploy Fusion Plus
  console.log("Publishing Fusion Plus, Pls Wait!!");
  const { packageId, publishTxn } = await publishPackage(
    `${__dirname}/../../../sui/fusion_plus`,
    client,
    deployer
  );

  console.log(
    `[Fusion Plus Published] Digest Id: ${publishTxn.digest}, Package Id: ${packageId}`
  );

  const fusionPlusObjectId = findObjectId(
    publishTxn.objectChanges || [],
    "created",
    `${packageId}::fusion_plus::FusionPlus`
  );
  const ownerCapId = findObjectId(
    publishTxn.objectChanges || [],
    "created",
    `${packageId}::fusion_plus::OwnerCap`
  );

  await sleep(10000);
  const block = await client.getTransactionBlock({ digest: publishTxn.digest });
  const contractAddress = packageId + fusionPlusObjectId.replace("0x", "");

  // Save initial deployment info
  const deploymentInfo: DeploymentInfo = {
    timestamp: Date.now(),
    network: args.network,
    chainId: network.chainId,
    packageId,
    contractAddress,
    deploymentTxHash: publishTxn.digest,
    blockHeight: Number(block.timestampMs) || undefined,
    objects: {
      fusionPlus: fusionPlusObjectId,
      ownerCap: ownerCapId,
    },
  };

  console.log(
    "[For LCD] Contract Address: ",
    contractAddress,
    " BlockHeight: ",
    block.timestampMs
  );

  // Initialize
  console.log("Initializing Fusion Plus, Pls Wait!!");
  const txb = new Transaction();
  txb.moveCall({
    target: `${packageId}::fusion_plus::initialize`,
    arguments: [
      txb.object(fusionPlusObjectId),
      txb.object(ownerCapId),
      txb.pure.u32(global.rescueDelaySrc),
      txb.pure.u32(global.rescueDelayDest),
    ],
  });
  const result = await signAndSendTx(client, txb, deployer);
  console.log("Fusion Plus Initialized With Digest: ", result.digest);

  // Update deployment info with initialization
  deploymentInfo.metadata = {
    ...deploymentInfo.metadata,
    initialized: true,
    initializationTxHash: result.digest,
  };

  console.log("\nDeployment Summary:");
  console.log("------------------");
  console.log("Network:", args.network);
  console.log("Package ID:", packageId);
  console.log("Contract Address:", contractAddress);
  console.log("FusionPlus Object ID:", fusionPlusObjectId);
  console.log("Owner Cap ID:", ownerCapId);
  console.log("Deploy Tx:", publishTxn.digest);
  console.log("Init Tx:", result.digest);
}

// Helper function to deploy token if needed
// async function deployToken(
//   client: SuiClient,
//   deployer: typeof Ed25519Keypair,
//   network: string
// ) {
//   console.log("Publishing Token, Pls Wait!!");
//   const { packageId, publishTxn } = await publishPackage(
//     `${__dirname}/../../../sui/token`,
//     client,
//     deployer
//   );

//   console.log(
//     `[Token Published] Digest Id: ${publishTxn.digest}, Package Id: ${packageId}`
//   );

//   const coinType = `${packageId}::token::TOKEN`;
//   const upgradeCapId = findObjectId(
//     publishTxn.objectChanges || [],
//     "created",
//     "0x2::package::UpgradeCap"
//   );
//   const treasuryCap = findObjectId(
//     publishTxn.objectChanges || [],
//     "created",
//     `0x2::coin::TreasuryCap<${coinType}>`
//   );
//   const coinMetadata = findObjectId(
//     publishTxn.objectChanges || [],
//     "created",
//     `0x2::coin::CoinMetadata<${coinType}>`
//   );

//   const block = await client.getTransactionBlock({ digest: publishTxn.digest });

//   // Save token deployment info
//   const deploymentInfo: DeploymentInfo = {
//     timestamp: Date.now(),
//     network,
//     chainId: networks.sui[network].chainId,
//     packageId,
//     deploymentTxHash: publishTxn.digest,
//     blockHeight: Number(block.timestampMs) || undefined,
//     objects: {
//       upgradeCap: upgradeCapId,
//       treasuryCap,
//       coinMetadata,
//     },
//     metadata: {
//       coinType,
//     },
//   };

//   saveDeployment("sui", network, "Token", deploymentInfo);

//   return {
//     packageId,
//     coinType,
//     upgradeCapId,
//     treasuryCap,
//     coinMetadata,
//     publishTxn,
//   };
// }

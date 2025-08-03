import { bech32 } from "bech32";
import tmp from "tmp";
import { execSync } from "child_process";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import {
  Transaction,
  TransactionObjectArgument,
} from "@mysten/sui/transactions";
import { SuiClient } from "@mysten/sui/client";
const fs = require("fs");

export function bech32PrivateKeyToHex(pk: string): string {
  try {
    const decodedResult = bech32.decode(pk);
    const decodedAddress = bech32.fromWords(decodedResult.words);
    const hexAddress = Buffer.from(decodedAddress).toString("hex");
    return "0x" + hexAddress.slice(2);
  } catch (error) {
    throw new Error(`Error decoding Bech32 address: ${error}`);
  }
}

export function findObjectId(
  objectChanges: any[],
  type: string,
  objectType: string
): string {
  return objectChanges.find(
    (obj) => obj.type == type && obj.objectType == objectType
  ).objectId;
}

export async function signAndSendTx(
  client: SuiClient,
  txb: Transaction | Uint8Array,
  signer: Ed25519Keypair
) {
  return await client.signAndExecuteTransaction({
    transaction: txb,
    signer,
    requestType: "WaitForLocalExecution",
    options: {
      showEffects: true,
      showEvents: true,
      showRawInput: true,
      showInput: true,
      showBalanceChanges: true,
      showObjectChanges: true,
    },
  });
}

export async function publishPackage(
  packagePath: string,
  client: SuiClient,
  keypair: Ed25519Keypair,
  withUnPublishedDependencies: boolean = false
) {
  // remove all controlled temporary objects on process exit
  const address = keypair.getPublicKey().toSuiAddress();
  tmp.setGracefulCleanup();
  const tmpobj = tmp.dirSync({ unsafeCleanup: true });
  await updateMoveToml(packagePath, "0x0");

  const { modules, dependencies } = JSON.parse(
    execSync(
      `sui move build --dump-bytecode-as-base64 --path "${packagePath}" --install-dir ${
        tmpobj.name
      } ${
        withUnPublishedDependencies ? "--with-unpublished-dependencies" : ""
      }`,
      {
        encoding: "utf-8",
        stdio: "pipe", // silent the output
      }
    )
  );
  const tx = new Transaction();
  const cap = tx.publish({
    modules,
    dependencies,
  });
  // Transfer the upgrade capability to the sender so they can upgrade the package later if they want.
  tx.transferObjects([cap], tx.pure.address(address));
  const publishTxn = await client.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,
    options: {
      showEffects: true,
      showObjectChanges: true,
      showBalanceChanges: true,
      showEvents: true,
      showRawInput: true,
      showInput: true,
    },
  });
  if (publishTxn.effects?.status.status != "success")
    throw new Error("Publish Tx failed");
  let packageId = (publishTxn.objectChanges?.filter(
    (a) => a.type === "published"
    // @ts-ignore
  ) ?? [])[0].packageId.replace(/^(0x)(0+)/, "0x");
  await updateMoveToml(packagePath, packageId);
  packageId = packageId.replace("0x", "");
  while (packageId.length < 64) packageId = "0" + packageId;
  return { packageId: "0x" + packageId, publishTxn };
}

export async function updateMoveToml(packagePath: string, packageId: string) {
  const path = `${packagePath}/Move.toml`;
  const toml = fs.readFileSync(path, "utf8");
  fs.writeFileSync(
    path,
    fillAddresses(insertPublishedAt(toml, packageId), packageId)
  );
}

export function insertPublishedAt(toml: string, packageId: string) {
  const lines = toml.split("\n");
  let packageLineIndex = lines.findIndex((line) =>
    line.startsWith("published-at")
  );
  if (packageLineIndex == -1) {
    // [package]
    let indexOfPackage = lines.findIndex((line) =>
      line.startsWith("[package]")
    );
    indexOfPackage++;
    while (true) {
      if (lines[indexOfPackage] == "" || lines[indexOfPackage].startsWith("["))
        break;
      indexOfPackage++;
    }
    if (lines[indexOfPackage] == "") packageLineIndex = indexOfPackage;
    else {
      lines.splice(indexOfPackage - 1, 0, "");
      packageLineIndex = indexOfPackage - 1;
    }
  }
  lines[packageLineIndex] = `published-at = "${packageId}"`;
  return lines.join("\n");
}

export function fillAddresses(toml: string, address: string) {
  const lines = toml.split("\n");
  const nameIdx = lines.findIndex((line: string) => line.startsWith("name"));
  const packageName = lines[nameIdx].match(/"([^"]+)"/)![1];
  const addressesIndex = lines.findIndex(
    (line) => line.slice(0, 11) === "[addresses]"
  );
  for (let i = addressesIndex + 1; i < lines.length; i++) {
    if (lines[i].startsWith(packageName))
      lines[i] = `${packageName} = "${address}"`;
  }
  return lines.join("\n");
}

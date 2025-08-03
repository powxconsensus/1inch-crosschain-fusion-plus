import type { CommandModule } from "yargs";
import { deployEVM } from "../handlers/evm/deploy";
import { deploySui } from "../handlers/sui/deploy";

interface DeployArgs {
  chain: string;
  network: string;
  accessTokenAddress?: string;
}

export const deployCommand: CommandModule<{}, DeployArgs> = {
  command: "deploy",
  describe: "Deploy Fusion Plus contracts",
  builder: (yargs) => {
    return yargs
      .option("chain", {
        alias: "c",
        description: "Chain type (evm or sui)",
        type: "string",
        choices: ["evm", "sui"],
        demandOption: true,
      })
      .option("network", {
        alias: "n",
        description: "Network to deploy to",
        type: "string",
        demandOption: true,
      })
      .option("accessTokenAddress", {
        alias: "at",
        description: "Existing access token address (optional)",
        type: "string",
      });
  },
  handler: async (argv) => {
    try {
      if (argv.chain === "evm") {
        await deployEVM(argv);
      } else if (argv.chain === "sui") {
        await deploySui(argv);
      }
    } catch (error) {
      console.error("Deployment failed:", error);
      process.exit(1);
    }
  },
};

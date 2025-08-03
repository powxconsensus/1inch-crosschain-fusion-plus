#!/usr/bin/env node
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { deployCommand } from "./commands/deploy";
import dotenv from "dotenv";

dotenv.config();

yargs(hideBin(process.argv))
  .command(deployCommand)
  .demandCommand(1, "You need to specify a command")
  .help()
  .alias("help", "h")
  .version()
  .alias("version", "v").argv;

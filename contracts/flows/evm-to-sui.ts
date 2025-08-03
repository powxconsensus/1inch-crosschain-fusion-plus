import { ethers, ZeroAddress } from "ethers";
import { abi as ESCROW_FACTORY_ABI } from "../evm/out/BaseEscrowFactory.sol/BaseEscrowFactory.json";
import { abi as SRC_ESCROW_ABI } from "../evm/out/EscrowSrc.sol/EscrowSrc.json";
import { abi as DST_ESCROW_ABI } from "../evm/out/EscrowDst.sol/EscrowDst.json";
import { abi as ERC20_ABI } from "../evm/out/ERC20.sol/ERC20.json";

import { getEvmWallet, getProvider, getSuiWallet } from "./wallet";
import { getChainConfigFromChainId } from "./config/chains";
import { Transaction } from "@mysten/sui/transactions";
import { bcs } from "@mysten/bcs";

import { Coin } from "./helpers/sui/coin";
import dotenv from "dotenv";
import { getContractAddress } from "./config/contracts";
import { signAndSendTx } from "./helpers/sui/utils";
import { sleep } from "../scripts/helper/utils";
import { SuiClient } from "@mysten/sui/client";
dotenv.config();

// Logging utilities
const EXPLORERS: any = {
  "43113": "https://testnet.snowtrace.io", // Avalanche testnet
  "sui-testnet": "https://suiexplorer.com/txblock",
};

function logTx(chainId: string, txHash: string, description: string) {
  console.log(`\n${description}:`);
  console.log(`Hash: ${txHash}`);
  console.log(`Explorer: ${EXPLORERS[chainId]}/${txHash}`);
}

function logStage(stage: string, data: any = null) {
  console.log(`\n[${stage}]`);
  if (data) console.log(JSON.stringify(data, null, 2));
}

function logOrderDetails(order: any) {
  console.log("\n📋 Order Details:");
  console.log(JSON.stringify(order, null, 2));
}

// Add new logging utility for order status
function logOrderStatus(stage: string, details: any) {
  console.log(`\n🔄 Stage: ${stage}`);
  console.log("📊 Details:");
  console.log(JSON.stringify(details, null, 2));
}

// for now takee is same address
const taker = "0xc0c4896B41cEdfcad38aeEc69d8fb31D80896B2a";

const SAFETY_DEPOSIT = {
  "evm": 1000,
  "sui": 0,
};

let GLOBAL_ORDER: any = {};

(async () => {
  // Step 0: Generate hash lock
  const secret = ethers.hexlify(ethers.randomBytes(32));
  const hashLock = ethers.keccak256(secret);

  // Step 1: Order setup
  const orderRequest = {
    srcChainId: "43113",
    dstChainId: "sui-testnet",
    srcToken: "0xf85C516579E97f0744917f0C8A0Ffc6aca98283d", // usdt on avalanche
    dstToken:
      "0xb089a394b5b0e2d2672518355c8931966602b3b67f280bf86e6b69d3508262dc::token::TOKEN", // usdt on sui
    srcAmount: "1000000",
    dstAmount: "100",
    maker: "0xc0c4896B41cEdfcad38aeEc69d8fb31D80896B2a",
    dstRecipient:
      "0x3617362e95f0779ecd6ccfebae1d6dd75cf6a1b892202af079222476d3d01f4f",
  };

  const chainConfig = getChainConfigFromChainId(orderRequest.srcChainId);
  const factory = new ethers.Contract(
    getContractAddress(orderRequest.srcChainId, "escrowFactory"),
    ESCROW_FACTORY_ABI,
    new ethers.JsonRpcProvider(chainConfig.rpc)
  );

  // Create timelock values
  const dstWithdrawal = 5; // withdrawal possible immediately
  const dstPublicWithdrawal = 10; // 10 sec
  const dstCancellation = 1800; // 30 min

  // Pack timelocks
  const now = Math.floor(Date.now() / 1000);
  const timelocks =
    (BigInt(now) << 224n) |
    (BigInt(dstCancellation) << 64n) |
    (BigInt(dstPublicWithdrawal) << 32n) |
    BigInt(dstWithdrawal);

  // Generate order hash
  const orderHash = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["bytes", "uint256", "uint256", "bytes32"],
      [
        orderRequest.maker,
        BigInt(orderRequest.srcAmount),
        BigInt(timelocks),
        hashLock,
      ]
    )
  );

  // Setup immutables
  const immutables = {
    orderHash,
    hashlock: hashLock,
    maker: BigInt(orderRequest.maker),
    taker: BigInt(taker),
    token: BigInt(orderRequest.srcToken),
    amount: BigInt(orderRequest.srcAmount),
    safetyDeposit: BigInt(SAFETY_DEPOSIT[chainConfig.type]).toString(),
    timelocks,
  };

  // Initialize global order
  GLOBAL_ORDER = {
    orderHash,
    hashLock,
    maker: orderRequest.maker,
    taker,
    sourceInfo: {
      chainId: orderRequest.srcChainId,
      token: orderRequest.srcToken,
      amount: orderRequest.srcAmount,
      safetyDeposit: BigInt(SAFETY_DEPOSIT[chainConfig.type]).toString(),
      timelocks: null,
      escrowAddress: null,
      txHashes: {
        srcEscrow: null,
        dstEscrow: null,
        srcWithdrawal: null,
        dstWithdrawal: null,
      },
    },
    destinationInfo: {
      chainId: orderRequest.dstChainId,
      token: orderRequest.dstToken,
      amount: orderRequest.dstAmount,
      safetyDeposit: BigInt(SAFETY_DEPOSIT[chainConfig.type]).toString(),
      timelocks: null,
      escrowAddress: null,
      txHashes: {
        srcEscrow: null,
        dstEscrow: null,
        srcWithdrawal: null,
        dstWithdrawal: null,
      },
    },
    secret,
    status: "pending",
  };

  // Log initial setup
  logStage("Cross-Chain Transfer Initiated", {
    source: {
      chain: "Avalanche Testnet",
      chainId: orderRequest.srcChainId,
      token: orderRequest.srcToken,
      amount: orderRequest.srcAmount,
      maker: orderRequest.maker,
    },
    destination: {
      chain: "Sui Testnet",
      chainId: orderRequest.dstChainId,
      token: orderRequest.dstToken,
      amount: orderRequest.dstAmount,
      recipient: orderRequest.dstRecipient,
    },
    security: {
      hashLock,
      timelocks: {
        withdrawal: dstWithdrawal,
        publicWithdrawal: dstPublicWithdrawal,
        cancellation: dstCancellation,
      },
      safetyDeposit: {
        evm: SAFETY_DEPOSIT["evm"],
        sui: SAFETY_DEPOSIT["sui"],
      },
    },
  });

  logOrderDetails(GLOBAL_ORDER);

  logStage("CHECKING TOKEN APPROVALS");
  // now check user have given proper approval to the factory contract or not
  const userWallet = getEvmWallet(
    "maker",
    new ethers.JsonRpcProvider(chainConfig.rpc)
  );
  const { hasBalance, hasAllowance } = await checkTokenBalanceAndAllowance(
    orderRequest.srcChainId,
    orderRequest.srcToken,
    userWallet.address,
    orderRequest.srcAmount,
    getContractAddress(orderRequest.srcChainId, "escrowFactory")
  );
  if (!hasBalance) throw new Error("Insufficient balance");
  if (!hasAllowance) {
    logStage("Approving Token Transfer");
    const tokenContract = new ethers.Contract(ZeroAddress, ERC20_ABI);
    const tx = await userWallet.sendTransaction({
      to: orderRequest.srcToken,
      data: tokenContract.interface.encodeFunctionData("approve", [
        getContractAddress(orderRequest.srcChainId, "escrowFactory"),
        orderRequest.srcAmount,
      ]),
    });
    await tx.wait(1);
    logTx(orderRequest.srcChainId, tx.hash, "Token Approval");
  } else {
    logStage("Token approval already granted");
  }

  // After approval check and before source escrow creation
  logStage("CROSS-CHAIN TRANSFER FLOW");
  console.log("\n📋 Transfer Steps:");
  console.log("1. Create Source Chain Escrow (Avalanche)");
  console.log("2. Create Destination Chain Escrow (Sui)");
  console.log("3. Process Withdrawals on Both Chains");
  console.log("4. Complete Transfer\n");

  // Step 3: Source Chain Escrow Creation
  {
    logStage("Creating Source Escrow", {
      chain: "Avalanche",
      token: orderRequest.srcToken,
      amount: orderRequest.srcAmount,
    });

    const srcFactory = new ethers.Contract(
      getContractAddress(orderRequest.srcChainId, "escrowFactory"),
      ESCROW_FACTORY_ABI,
      new ethers.JsonRpcProvider(chainConfig.rpc)
    );

    const tx = await userWallet.sendTransaction({
      to: getContractAddress(orderRequest.srcChainId, "escrowFactory"),
      data: srcFactory.interface.encodeFunctionData("createSrcEscrow", [
        immutables,
      ]),
      value: immutables.safetyDeposit,
    });
    await tx.wait(1);

    const { timelocks, escrow } = await readEventFromEvmTx(
      tx.hash,
      chainConfig
    );
    GLOBAL_ORDER.sourceInfo.timelocks = timelocks;
    GLOBAL_ORDER.sourceInfo.txHashes.srcEscrow = tx.hash;
    GLOBAL_ORDER.sourceInfo.escrowAddress = escrow;

    logTx(orderRequest.srcChainId, tx.hash, "Source Escrow Created");
  }

  // Step 4: Destination Chain (Sui) Escrow Creation
  {
    logStage("Creating Destination Escrow", {
      chain: "Sui",
      token: orderRequest.dstToken,
      amount: orderRequest.dstAmount,
    });

    const signer = getSuiWallet("taker");
    const client: SuiClient = getProvider(
      getChainConfigFromChainId(orderRequest.dstChainId)
    ) as SuiClient;
    const contractAddress = getContractAddress(
      orderRequest.dstChainId,
      "escrowFactory"
    );
    const packageId = ethers.hexlify(
      ethers.getBytes(contractAddress).slice(0, 32)
    );
    const objectId = ethers.hexlify(
      ethers.getBytes(contractAddress).slice(32, 64)
    );

    const txb = new Transaction();
    const oimmutables = txb.moveCall({
      target: `${packageId}::base_escrow::new`,
      arguments: [
        bcs.vector(bcs.u8()).serialize(ethers.getBytes(orderHash).map(Number)), // order_hash
        bcs.vector(bcs.u8()).serialize(ethers.getBytes(hashLock).map(Number)), // hashlock
        txb.pure.u256(getSuiWallet("taker").getPublicKey().toSuiAddress()), // maker
        txb.pure.u256(orderRequest.dstRecipient), // taker
        txb.pure.u256(orderRequest.dstToken.split("::")[0]), // token
        txb.pure.u64(orderRequest.dstAmount), // amount
        txb.pure.u64(SAFETY_DEPOSIT["sui"]), // safety_deposit
        txb.pure.u256(timelocks), // safety_deposit
      ],
    });
    let option: any;
    const coin = new Coin(client);
    if (SAFETY_DEPOSIT["sui"] > 0) {
      const suiAddress =
        "0x000000000000000000000000000000000000000000000000000002::sui::sui";
      const coin = new Coin(client);
      const amount = SAFETY_DEPOSIT["sui"];
      const [splitedCoins, mergedCoin] = await coin.takeAmountFromCoins(
        signer.getPublicKey().toSuiAddress(),
        suiAddress,
        amount,
        txb
      );
      option = txb.moveCall({
        target: `0x1::option::some`,
        arguments: [splitedCoins],
        typeArguments: [`0x2::coin::Coin<0x2::sui::SUI>`],
      });
    } else {
      option = txb.moveCall({
        target: `0x1::option::none`,
        arguments: [],
        typeArguments: [`0x2::coin::Coin<0x2::sui::SUI>`],
      });
    }

    const [splitedCoins, mergedCoin] = await coin.takeAmountFromCoins(
      signer.getPublicKey().toSuiAddress(),
      orderRequest.dstToken,
      Number(orderRequest.dstAmount),
      txb
    );

    txb.moveCall({
      target: `${packageId}::fusion_plus::create_dst_escrow`,
      arguments: [
        txb.object(objectId), // escrow_factory
        option, // safety_deposit
        splitedCoins, // token
        oimmutables, // immutables
        txb.pure.u32(4294967294),
      ],
      typeArguments: [orderRequest.dstToken],
    });

    const tx = await signAndSendTx(client, txb, signer);
    const receipt = await client.getTransactionBlock({
      digest: tx.digest,
      options: { showEvents: true },
    });
    const dstEscrowCreatedEvent = receipt.events?.[0]?.parsedJson as any;

    GLOBAL_ORDER.destinationInfo.timelocks = ethers.hexlify(
      Uint8Array.from(dstEscrowCreatedEvent.hashlock)
    );
    GLOBAL_ORDER.destinationInfo.txHashes.dstEscrow = tx.digest;
    GLOBAL_ORDER.destinationInfo.escrowAddress =
      dstEscrowCreatedEvent.escrow_id;
    GLOBAL_ORDER.destinationInfo.timelocks = dstEscrowCreatedEvent.timelocks;

    logTx(orderRequest.dstChainId, tx.digest, "Destination Escrow Created");
  }

  await sleep(5000);

  // Step 5: Process Withdrawals
  logStage("STEP 3: PROCESSING WITHDRAWALS");
  console.log("\n🔄 Initiating withdrawals in sequence:");
  console.log("1. First on Sui (destination chain)");
  console.log("2. Then on Avalanche (source chain)");

  // Destination (Sui) withdrawal
  {
    logStage("Processing Destination Withdrawal", { chain: "Sui" });
    const dstSigner = getSuiWallet("taker");
    const dstClient: SuiClient = getProvider(
      getChainConfigFromChainId(orderRequest.dstChainId)
    ) as SuiClient;
    const dstContractAddress = getContractAddress(
      orderRequest.dstChainId,
      "escrowFactory"
    );
    const dstPackageId = ethers.hexlify(
      ethers.getBytes(dstContractAddress).slice(0, 32)
    );
    const dstObjectId = ethers.hexlify(
      ethers.getBytes(dstContractAddress).slice(32, 64)
    );

    const dstTxb = new Transaction();
    const dstOimmutables = dstTxb.moveCall({
      target: `${dstPackageId}::base_escrow::new`,
      arguments: [
        bcs.vector(bcs.u8()).serialize(ethers.getBytes(orderHash).map(Number)), // order_hash
        bcs.vector(bcs.u8()).serialize(ethers.getBytes(hashLock).map(Number)), // hashlock
        dstTxb.pure.u256(dstSigner.getPublicKey().toSuiAddress()), // maker
        dstTxb.pure.u256(orderRequest.dstRecipient), // taker
        dstTxb.pure.u256(orderRequest.dstToken.split("::")[0]), // token
        dstTxb.pure.u64(orderRequest.dstAmount), // amount
        dstTxb.pure.u64(SAFETY_DEPOSIT["sui"]), // safety_deposit
        dstTxb.pure.u256(GLOBAL_ORDER.destinationInfo.timelocks), // timelocks
      ],
    });

    dstTxb.moveCall({
      target: `${dstPackageId}::dst_escrow::public_withdraw`,
      arguments: [
        dstTxb.object(GLOBAL_ORDER.destinationInfo.escrowAddress), // escrow object id
        bcs.vector(bcs.u8()).serialize(ethers.getBytes(secret).map(Number)),
        dstOimmutables,
      ],
      typeArguments: [orderRequest.dstToken],
    });
    const dstTx = await signAndSendTx(dstClient, dstTxb, dstSigner);
    GLOBAL_ORDER.destinationInfo.txHashes.dstWithdrawal = dstTx.digest;
    logTx(orderRequest.dstChainId, dstTx.digest, "Sui Withdrawal Complete");
  }

  // Source (Avalanche) withdrawal
  {
    logStage("Processing Source Withdrawal", { chain: "Avalanche" });
    const srcSigner = getEvmWallet(
      "taker",
      new ethers.JsonRpcProvider(chainConfig.rpc)
    );

    const srcEscrowContract = new ethers.Contract(
      ZeroAddress,
      SRC_ESCROW_ABI,
      new ethers.JsonRpcProvider(chainConfig.rpc)
    );

    const withdrawImmutables = {
      orderHash,
      hashlock: hashLock,
      maker: BigInt(orderRequest.maker),
      taker: BigInt(taker),
      token: BigInt(orderRequest.srcToken),
      amount: BigInt(orderRequest.srcAmount),
      safetyDeposit: BigInt(SAFETY_DEPOSIT[chainConfig.type]).toString(),
      timelocks: GLOBAL_ORDER.sourceInfo.timelocks,
    };

    const calldata = {
      data: srcEscrowContract.interface.encodeFunctionData("withdraw", [
        secret,
        withdrawImmutables,
      ]),
      value: 0,
      to: GLOBAL_ORDER.sourceInfo.escrowAddress,
    };

    const srcTx = await srcSigner
      .connect(new ethers.JsonRpcProvider(chainConfig.rpc))
      .sendTransaction({
        ...calldata,
        gasLimit: 6000000,
        gasPrice: ethers.parseUnits("10", "gwei"),
      });
    await srcTx.wait(1);
    GLOBAL_ORDER.sourceInfo.txHashes.srcWithdrawal = srcTx.hash;
    logTx(orderRequest.srcChainId, srcTx.hash, "Avalanche Withdrawal Complete");
  }

  logStage("CROSS-CHAIN TRANSFER COMPLETED");
  console.log("\n✅ Transfer Summary:");
  console.log("\n📤 Source Chain (Avalanche):");
  console.log(
    `- Escrow Creation: ${GLOBAL_ORDER.sourceInfo.txHashes.srcEscrow}`
  );
  console.log(
    `- Withdrawal: ${GLOBAL_ORDER.sourceInfo.txHashes.srcWithdrawal}`
  );
  console.log(`- Explorer: ${EXPLORERS[orderRequest.srcChainId]}`);

  console.log("\n📥 Destination Chain (Sui):");
  console.log(
    `- Escrow Creation: ${GLOBAL_ORDER.destinationInfo.txHashes.dstEscrow}`
  );
  console.log(
    `- Withdrawal: ${GLOBAL_ORDER.destinationInfo.txHashes.dstWithdrawal}`
  );
  console.log(`- Explorer: ${EXPLORERS[orderRequest.dstChainId]}`);

  console.log("\n🔐 Hash Lock Details:");
  console.log(`- Hash: ${hashLock}`);
  console.log(`- Secret (used): ${secret}`);

  logOrderDetails(GLOBAL_ORDER);
})();

async function checkTokenBalanceAndAllowance(
  chainId: string,
  tokenAddress: string,
  userAddress: string,
  amount: string,
  spenderAddress: string
): Promise<{ hasBalance: boolean; hasAllowance: boolean }> {
  const chainConfig = getChainConfigFromChainId(chainId);
  switch (chainConfig.type) {
    case "evm":
      const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ERC20_ABI,
        provider
      );
      const [balance, allowance] = await Promise.all([
        tokenContract.balanceOf(userAddress),
        tokenContract.allowance(userAddress, spenderAddress),
      ]);
      return {
        hasBalance: balance >= BigInt(amount),
        hasAllowance: allowance >= BigInt(amount),
      };
    case "sui":
      // TODO: Implement SUI balance and allowance check
      return {
        hasBalance: false,
        hasAllowance: false,
      };
      break;
    default:
      throw new Error(`Chain ${chainId} not supported`);
  }
}

async function readEventFromEvmTx(txHash: string, chainConfig: any) {
  const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
  const tx = await provider.getTransaction(txHash);
  const [log] = await provider.getLogs({
    address: tx?.to as string,
    topics: [
      "0x3a126174094141c8b6104a22f38dccc1f55c22f03b5bd150f0d6fed3c7d25f6b",
    ],
    blockHash: tx?.blockHash as string,
  });
  const [tuple, escrow] = ethers.AbiCoder.defaultAbiCoder().decode(
    [
      "((bytes32,bytes32,uint256,uint256,uint256,uint256,uint256,uint256),address)",
    ],
    log.data
  )[0];

  return {
    timelocks: tuple[7].toString(),
    escrow: escrow.toString(),
  };
}

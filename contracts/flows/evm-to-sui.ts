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

// for now takee is same address
const taker = "0xc0c4896B41cEdfcad38aeEc69d8fb31D80896B2a";

const SAFETY_DEPOSIT = {
  "evm": 1000,
  "sui": 0,
};

let GLOBAL_ORDER: any = {};

(async () => {
  // Step 0: user will create secret key and hash lock it
  const secret = ethers.hexlify(ethers.randomBytes(32)); // will kept private by the user
  const hashLock = ethers.keccak256(secret);

  // Step 1: user will create order (this object from user (client side))
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

  // Generate order hash and secret
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

  // step 2: generate call data for the user to sign and submit to the chain
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
  console.log(GLOBAL_ORDER);

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
    const tokenContract = new ethers.Contract(ZeroAddress, ERC20_ABI);
    const tx = await userWallet.sendTransaction({
      to: orderRequest.srcToken,
      data: tokenContract.interface.encodeFunctionData("approve", [
        getContractAddress(orderRequest.srcChainId, "escrowFactory"),
        orderRequest.srcAmount,
      ]),
    });
    await tx.wait(1);
  }

  // Step 3: user will send order to the market
  {
    const tx = await userWallet.sendTransaction({
      to: getContractAddress(orderRequest.srcChainId, "escrowFactory"),
      data: factory.interface.encodeFunctionData("createSrcEscrow", [
        immutables,
      ]),
      value: immutables.safetyDeposit,
    });
    await tx.wait(1);
    console.log("src tx created with tx hash", tx.hash);
    await sleep(2000);
    const { timelocks, escrow } = await readEventFromEvmTx(
      tx.hash,
      chainConfig
    );
    GLOBAL_ORDER.sourceInfo.timelocks = timelocks;
    GLOBAL_ORDER.sourceInfo.txHashes.srcEscrow = tx.hash;
    GLOBAL_ORDER.sourceInfo.escrowAddress = escrow;
  }

  // Step 4: now resolver will deploy the dst escrow
  {
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
    console.log(orderRequest.dstToken);
    console.log(`0x2::coin::Coin<${orderRequest.dstToken}>`);

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
    await sleep(1000);
    {
      const receipt = await client.getTransactionBlock({
        digest: tx.digest,
        options: {
          showEvents: true,
        },
      });
      const dstEscrowCreatedEvent = receipt.events?.[0]?.parsedJson as any;
      console.log(dstEscrowCreatedEvent);

      GLOBAL_ORDER.destinationInfo.timelocks = ethers.hexlify(
        Uint8Array.from(dstEscrowCreatedEvent.hashlock)
      );
      GLOBAL_ORDER.destinationInfo.txHashes.dstEscrow = tx.digest;
      GLOBAL_ORDER.destinationInfo.escrowAddress =
        dstEscrowCreatedEvent.escrow_id;
      GLOBAL_ORDER.destinationInfo.timelocks = dstEscrowCreatedEvent.timelocks;
    }
    console.log(GLOBAL_ORDER);
  }

  await sleep(5000); // wait for 5 seconds

  // Step 5: now resolver will move fund from src escrow  and dst escrow
  {
    // try to withdraw from dst first to see if sui is working or not
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
        txb.pure.u256(GLOBAL_ORDER.destinationInfo.timelocks), // timelocks
      ],
    });
    console.log(secret);

    txb.moveCall({
      target: `${packageId}::dst_escrow::public_withdraw`,
      arguments: [
        txb.object(GLOBAL_ORDER.destinationInfo.escrowAddress), // escrow object id
        bcs.vector(bcs.u8()).serialize(ethers.getBytes(secret).map(Number)),
        oimmutables,
      ],
      typeArguments: [orderRequest.dstToken],
    });
    const tx = await signAndSendTx(client, txb, signer);
    console.log(tx.digest);
  }

  // withdraw from src escrow
  {
    const signer = getEvmWallet(
      "taker",
      new ethers.JsonRpcProvider(chainConfig.rpc)
    );
    const provider = new ethers.JsonRpcProvider(chainConfig.rpc);
    const factory = new ethers.Contract(
      ZeroAddress,
      SRC_ESCROW_ABI,
      new ethers.JsonRpcProvider(chainConfig.rpc)
    );
    // // Create escrow immutables
    const immutables = {
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
      data: factory.interface.encodeFunctionData("withdraw", [
        secret,
        immutables,
      ]),
      value: 0,
      to: GLOBAL_ORDER.sourceInfo.escrowAddress,
    };
    const tx = await signer
      .connect(new ethers.JsonRpcProvider(chainConfig.rpc))
      .sendTransaction({
        ...calldata,
        gasLimit: 6000000,
        gasPrice: ethers.parseUnits("10", "gwei"),
      });
    await tx.wait(1);
    console.log(tx);
  }
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

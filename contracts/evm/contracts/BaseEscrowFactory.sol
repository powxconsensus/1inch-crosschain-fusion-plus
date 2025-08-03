// SPDX-License-Identifier: MIT

pragma solidity ^0.8.23;

import {Clones} from "openzeppelin-contracts/contracts/proxy/Clones.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {Create2} from "openzeppelin-contracts/contracts/utils/Create2.sol";
import {Address, AddressLib} from "solidity-utils/contracts/libraries/AddressLib.sol";
import {SafeERC20} from "solidity-utils/contracts/libraries/SafeERC20.sol";

import {ImmutablesLib} from "./libraries/ImmutablesLib.sol";
import {Timelocks, TimelocksLib} from "./libraries/TimelocksLib.sol";

import {IEscrowFactory} from "./interfaces/IEscrowFactory.sol";
import {IBaseEscrow} from "./interfaces/IBaseEscrow.sol";
import {SRC_IMMUTABLES_LENGTH} from "./EscrowFactoryContext.sol";

/**
 * @title Abstract contract for escrow factory
 * @notice Contract to create escrow contracts for cross-chain atomic swap.
 * @dev Immutable variables must be set in the constructor of the derived contracts.
 * @custom:security-contact security@1inch.io
 */
abstract contract BaseEscrowFactory is IEscrowFactory {
    using AddressLib for Address;
    using Clones for address;
    using ImmutablesLib for IBaseEscrow.Immutables;
    using SafeERC20 for IERC20;
    using TimelocksLib for Timelocks;

    /// @notice See {IEscrowFactory-ESCROW_SRC_IMPLEMENTATION}.
    address public immutable ESCROW_SRC_IMPLEMENTATION;
    /// @notice See {IEscrowFactory-ESCROW_DST_IMPLEMENTATION}.
    address public immutable ESCROW_DST_IMPLEMENTATION;
    bytes32 internal immutable _PROXY_SRC_BYTECODE_HASH;
    bytes32 internal immutable _PROXY_DST_BYTECODE_HASH;

    /* @notice Deploys a new escrow contract for maker on the source chain.
     * @param immutables The immutables of the escrow contract that are used in deployment.
     * @param order Order quote to fill.
     * @param r R component of signature.
     * @param vs VS component of signature.
     * @param amount Taker amount to fill
     * @param takerTraits Specifies threshold as maximum allowed takingAmount when takingAmount is zero, otherwise specifies
     * minimum allowed makingAmount. The 2nd (0 based index) highest bit specifies whether taker wants to skip maker's permit.
     * @param args Arguments that are used by the taker (target, extension, interaction, permit).
     */
    // in case of native token, user have to wrap it and then transfer it
    function createSrcEscrow(
        IBaseEscrow.Immutables calldata immutables
    ) external payable {
        address token = immutables.token.get();
        uint256 nativeAmount = immutables.safetyDeposit;
        if (msg.value != nativeAmount) revert InsufficientEscrowBalance();

        IBaseEscrow.Immutables memory updatedImmutables = immutables;
        updatedImmutables.timelocks = immutables.timelocks.setDeployedAt(
            block.timestamp
        );

        bytes32 salt = updatedImmutables.hashMem();
        address escrow = _deployEscrow(
            salt,
            nativeAmount,
            ESCROW_SRC_IMPLEMENTATION
        );
        emit SrcEscrowCreated(updatedImmutables, escrow);

        if (token != address(0)) {
            IERC20(token).safeTransferFrom(
                immutables.maker.get(),
                escrow,
                immutables.amount
            );
        }
        if (
            escrow.balance < immutables.safetyDeposit ||
            IERC20(immutables.token.get()).safeBalanceOf(escrow) <
            immutables.amount
        ) {
            revert InsufficientEscrowBalance();
        }
    }

    /**
     * @notice Deploys a new escrow contract for taker on the destination chain.
     * @param dstImmutables The immutables of the escrow contract that are used in deployment.
     * @param srcCancellationTimestamp The start of the cancellation period for the source chain.
     */

    function createDstEscrow(
        IBaseEscrow.Immutables calldata dstImmutables,
        uint256 srcCancellationTimestamp
    ) external payable {
        address token = dstImmutables.token.get();
        uint256 nativeAmount = dstImmutables.safetyDeposit;
        if (token == address(0)) {
            nativeAmount += dstImmutables.amount;
        }
        if (msg.value != nativeAmount) revert InsufficientEscrowBalance();

        IBaseEscrow.Immutables memory immutables = dstImmutables;
        immutables.timelocks = immutables.timelocks.setDeployedAt(
            block.timestamp
        );
        // Check that the escrow cancellation will start not later than the cancellation time on the source chain.
        if (
            immutables.timelocks.get(TimelocksLib.Stage.DstCancellation) >
            srcCancellationTimestamp
        ) revert InvalidCreationTime();

        bytes32 salt = immutables.hashMem();
        address escrow = _deployEscrow(
            salt,
            msg.value,
            ESCROW_DST_IMPLEMENTATION
        );
        if (token != address(0)) {
            IERC20(token).safeTransferFrom(
                msg.sender,
                escrow,
                immutables.amount
            );
        }

        emit DstEscrowCreated(
            immutables.orderHash,
            escrow,
            dstImmutables.hashlock,
            dstImmutables.taker,
            immutables.timelocks
        );
    }

    /**
     * @notice See {IEscrowFactory-addressOfEscrowSrc}.
     */
    function addressOfEscrowSrc(
        IBaseEscrow.Immutables calldata immutables
    ) external view virtual returns (address) {
        return
            Create2.computeAddress(immutables.hash(), _PROXY_SRC_BYTECODE_HASH);
    }

    /**
     * @notice See {IEscrowFactory-addressOfEscrowDst}.
     */
    function addressOfEscrowDst(
        IBaseEscrow.Immutables calldata immutables
    ) external view virtual returns (address) {
        return
            Create2.computeAddress(immutables.hash(), _PROXY_DST_BYTECODE_HASH);
    }

    /**
     * @notice Deploys a new escrow contract.
     * @param salt The salt for the deterministic address computation.
     * @param value The value to be sent to the escrow contract.
     * @param implementation Address of the implementation.
     * @return escrow The address of the deployed escrow contract.
     */
    function _deployEscrow(
        bytes32 salt,
        uint256 value,
        address implementation
    ) internal virtual returns (address escrow) {
        escrow = implementation.cloneDeterministic(salt, value);
    }
}

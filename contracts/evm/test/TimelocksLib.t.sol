// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {TimelocksLib, Timelocks} from "../contracts/libraries/TimelocksLib.sol";

contract TimelocksLibTest is Test {
    using TimelocksLib for Timelocks;

    function testTimelocksBitPacking() public {
        Timelocks t;

        // Set the deployment time to 1_000_000
        uint256 deployedAt = 1_000_000;
        t = TimelocksLib.setDeployedAt(t, deployedAt);

        // Manually pack 7 stage values (each 32-bit)
        // Let's say each stage is offset by 100, 200, 300, ... up to 700
        uint256 packed = Timelocks.unwrap(t);
        packed |= uint32(100); // Stage 0
        packed |= uint32(200) << 32; // Stage 1
        packed |= uint32(300) << 64; // Stage 2
        packed |= uint32(400) << 96; // Stage 3
        packed |= uint32(500) << 128; // Stage 4
        packed |= uint32(600) << 160; // Stage 5
        packed |= uint32(700) << 192; // Stage 6

        // Wrap it back into Timelocks
        t = Timelocks.wrap(packed);

        // Check deployedAt
        uint256 deployed = Timelocks.unwrap(t) >> 224;
        assertEq(deployed, deployedAt);

        // Check stage values
        for (uint8 i = 0; i < 7; ++i) {
            uint256 expected = deployedAt + (100 * (i + 1));
            uint256 actual = TimelocksLib.get(t, TimelocksLib.Stage(i));
            assertEq(
                actual,
                expected,
                string(abi.encodePacked("Stage ", vm.toString(i), " failed"))
            );
        }
    }

    function testSetDeployedAt() public {
        uint256 deployedAt = 1000;
        Timelocks timelocks = Timelocks.wrap(0);

        timelocks = timelocks.setDeployedAt(deployedAt);

        // Verify deployed_at is set correctly
        uint256 result = Timelocks.unwrap(timelocks) >> 224;
        assertEq(result, deployedAt);
    }

    function testRescueStart() public {
        uint256 deployedAt = 1000;
        uint256 rescueDelay = 500;

        Timelocks timelocks = Timelocks.wrap(0);
        timelocks = timelocks.setDeployedAt(deployedAt);

        uint256 result = timelocks.rescueStart(rescueDelay);
        uint256 expected = deployedAt + rescueDelay;
        assertEq(result, expected);
    }

    function testGetSingleStage() public {
        uint256 deployedAt = 5000;
        uint256 dstWithdrawalOffset = 100; // stage 4

        // Set the offset for dst_withdrawal stage (stage 4)
        uint256 packedOffsets = dstWithdrawalOffset << (4 * 32);
        Timelocks timelocks = Timelocks.wrap(packedOffsets);
        timelocks = timelocks.setDeployedAt(deployedAt);

        uint256 result = timelocks.get(TimelocksLib.Stage.DstWithdrawal);
        uint256 expected = deployedAt + dstWithdrawalOffset;
        assertEq(result, expected);
    }

    function testGetZeroStage() public {
        uint256 deployedAt = 5000;

        Timelocks timelocks = Timelocks.wrap(0);
        timelocks = timelocks.setDeployedAt(deployedAt);

        // Get a stage that has not been set, its offset is 0.
        uint256 result = timelocks.get(TimelocksLib.Stage.SrcCancellation);
        uint256 expected = deployedAt; // deployed_at + 0
        assertEq(result, expected);
    }

    function testGetWithMultipleStagesSet() public {
        // Test that each stage only considers its own offset, not others
        uint256 deployedAt = 1000;
        uint256 srcWithdrawalOffset = 10; // stage 0
        uint256 srcPublicWithdrawalOffset = 20; // stage 1
        uint256 srcCancellationOffset = 30; // stage 2

        // Construct the packed uint256 value with multiple stage offsets
        uint256 packedOffsets = (srcCancellationOffset << (2 * 32)) |
            (srcPublicWithdrawalOffset << 32) |
            srcWithdrawalOffset;

        Timelocks timelocks = Timelocks.wrap(packedOffsets);
        timelocks = timelocks.setDeployedAt(deployedAt);

        // Test each stage returns only its own offset
        uint256 resultSrcWithdrawal = timelocks.get(
            TimelocksLib.Stage.SrcWithdrawal
        );
        uint256 expectedSrcWithdrawal = deployedAt + srcWithdrawalOffset;
        assertEq(resultSrcWithdrawal, expectedSrcWithdrawal);

        uint256 resultSrcPublicWithdrawal = timelocks.get(
            TimelocksLib.Stage.SrcPublicWithdrawal
        );
        uint256 expectedSrcPublicWithdrawal = deployedAt +
            srcPublicWithdrawalOffset;
        assertEq(resultSrcPublicWithdrawal, expectedSrcPublicWithdrawal);

        uint256 resultSrcCancellation = timelocks.get(
            TimelocksLib.Stage.SrcCancellation
        );
        uint256 expectedSrcCancellation = deployedAt + srcCancellationOffset;
        assertEq(resultSrcCancellation, expectedSrcCancellation);
    }

    function testGetAllStages() public {
        uint256 deployedAt = 2000;

        // Set different offsets for all stages
        uint256[] memory offsets = new uint256[](7);
        offsets[0] = 10; // src_withdrawal
        offsets[1] = 20; // src_public_withdrawal
        offsets[2] = 30; // src_cancellation
        offsets[3] = 40; // src_public_cancellation
        offsets[4] = 50; // dst_withdrawal
        offsets[5] = 60; // dst_public_withdrawal
        offsets[6] = 70; // dst_cancellation

        uint256 packedOffsets = 0;
        for (uint256 i = 0; i < 7; i++) {
            packedOffsets = packedOffsets | (offsets[i] << (i * 32));
        }

        Timelocks timelocks = Timelocks.wrap(packedOffsets);
        timelocks = timelocks.setDeployedAt(deployedAt);

        // Test all stages
        TimelocksLib.Stage[] memory stages = new TimelocksLib.Stage[](7);
        stages[0] = TimelocksLib.Stage.SrcWithdrawal;
        stages[1] = TimelocksLib.Stage.SrcPublicWithdrawal;
        stages[2] = TimelocksLib.Stage.SrcCancellation;
        stages[3] = TimelocksLib.Stage.SrcPublicCancellation;
        stages[4] = TimelocksLib.Stage.DstWithdrawal;
        stages[5] = TimelocksLib.Stage.DstPublicWithdrawal;
        stages[6] = TimelocksLib.Stage.DstCancellation;

        for (uint256 i = 0; i < 7; i++) {
            uint256 result = timelocks.get(stages[i]);
            uint256 expected = deployedAt + offsets[i];
            assertEq(result, expected);
        }
    }

    function testLargeValues() public {
        // Test with large values to ensure no overflow issues
        uint256 deployedAt = 0xffffffff; // Max uint32
        uint256 offset = 0xffffffff; // Max uint32

        uint256 packedOffsets = offset;
        Timelocks timelocks = Timelocks.wrap(packedOffsets);
        timelocks = timelocks.setDeployedAt(deployedAt);

        uint256 result = timelocks.get(TimelocksLib.Stage.SrcWithdrawal);
        uint256 expected = deployedAt + offset;
        assertEq(result, expected);
    }

    // Function to get test results for comparison with Move
    function getTestResults()
        public
        pure
        returns (
            uint256[] memory deployedAts,
            uint256[] memory rescueDelays,
            uint256[] memory packedOffsets,
            uint256[] memory expectedResults
        )
    {
        deployedAts = new uint256[](5);
        rescueDelays = new uint256[](5);
        packedOffsets = new uint256[](5);
        expectedResults = new uint256[](5);

        // Test case 1: Basic rescue start
        deployedAts[0] = 1000;
        rescueDelays[0] = 500;
        packedOffsets[0] = 0;
        expectedResults[0] = 1500; // deployedAt + rescueDelay

        // Test case 2: Single stage
        deployedAts[1] = 5000;
        rescueDelays[1] = 0;
        packedOffsets[1] = 100 << (4 * 32); // dst_withdrawal offset
        expectedResults[1] = 5100; // deployedAt + offset

        // Test case 3: Multiple stages
        deployedAts[2] = 2000;
        rescueDelays[2] = 0;
        packedOffsets[2] = (30 << (2 * 32)) | (20 << 32) | 10; // 3 stages
        expectedResults[2] = 2010; // deployedAt + src_withdrawal_offset

        // Test case 4: Zero stage
        deployedAts[3] = 3000;
        rescueDelays[3] = 0;
        packedOffsets[3] = 0;
        expectedResults[3] = 3000; // deployedAt + 0

        // Test case 5: Large values
        deployedAts[4] = 0xffffffff;
        rescueDelays[4] = 0;
        packedOffsets[4] = 0xffffffff;
        expectedResults[4] = 0x1ffffffe; // deployedAt + offset
    }
}

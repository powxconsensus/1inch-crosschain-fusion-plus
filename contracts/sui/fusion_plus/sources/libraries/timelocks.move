/**
 * @dev Timelocks for the source and the destination chains plus the deployment timestamp.
 * Timelocks store the number of seconds from the time the contract is deployed to the start of a specific period.
 * For illustrative purposes, it is possible to describe timelocks by two structures:
 * struct SrcTimelocks {
 *     uint256 withdrawal;
 *     uint256 publicWithdrawal;
 *     uint256 cancellation;
 *     uint256 publicCancellation;
 * }
 *
 * struct DstTimelocks {
 *     uint256 withdrawal;
 *     uint256 publicWithdrawal;
 *     uint256 cancellation;
 * }
 *
 * withdrawal: Period when only the taker with a secret can withdraw tokens for taker (source chain) or maker (destination chain).
 * publicWithdrawal: Period when anyone with a secret can withdraw tokens for taker (source chain) or maker (destination chain).
 * cancellation: Period when escrow can only be cancelled by the taker.
 * publicCancellation: Period when escrow can be cancelled by anyone.
 *
 * @custom:security-contact security@1inch.io
 */
 module fusion_plus::timelocks {
    //  Stage enum
    use std::u256;

    const DEPLOYED_AT_MASK: u256 = 0xffffffff00000000000000000000000000000000000000000000000000000000;
    const DEPLOYED_AT_OFFSET: u8 = 224;
    const STAGE_MASK: u256 = 0xffffffff; // 32-bit mask for each stage

    
    public fun src_withdrawal(): u8 { 0 }
    public fun src_public_withdrawal(): u8 { 1 }
    public fun src_cancellation(): u8 { 2 }
    public fun src_public_cancellation(): u8 { 3 }
    public fun dst_withdrawal(): u8 { 4 }
    public fun dst_public_withdrawal(): u8 { 5 }
    public fun dst_cancellation(): u8 { 6 }


    public struct Timelocks has copy, drop, store {
        value: u256
    }

    public fun from_u256(value: u256): Timelocks {
        Timelocks { value }
    }

    public fun to_u256(timelocks: &Timelocks): u256 {
        timelocks.value
    }

    /**
     * @notice Sets the Escrow deployment timestamp.
     * @param timelocks The timelocks to set the deployment timestamp to.
     * @param value The new Escrow deployment timestamp.
     * @return The timelocks with the deployment timestamp set.
     */
    public fun set_deployed_at(timelocks: &mut Timelocks, value: u256) {
        let value: u256 = (timelocks.value & u256::bitwise_not(DEPLOYED_AT_MASK)) | (value << DEPLOYED_AT_OFFSET);
        timelocks.value = value;
    }

    /**
     * @notice Returns the start of the rescue period.
     * @param timelocks The timelocks to get the rescue delay from.
     * @return The start of the rescue period.
     */
    public fun rescue_start(timelocks: &Timelocks, rescue_delay: u256): u256 {
        rescue_delay + (timelocks.value >> DEPLOYED_AT_OFFSET)
    }

    /**
     * @notice Returns the timelock value for the given stage.
     * @param timelocks The timelocks to get the value from.
     * @param stage The stage to get the value for.
     * @return The timelock value for the given stage.
     */
    public fun get(timelocks: &Timelocks, stage: u8): u256 {
        let data = timelocks.value;
        let bit_shift = stage * 32;
        // Extract only the 32-bit value for this specific stage
        let stage_value = (data >> bit_shift) & STAGE_MASK;
        // The maximum uint32 value will be reached in 2106.
        (data >> DEPLOYED_AT_OFFSET) + stage_value
    }

    #[test_only]
    fun u64_to_u256(v: u64): u256 {
        v as u256
    }

    #[test]
    fun test_set_deployed_at() {
        let deployed_at = 1000u64;
        let mut timelocks = from_u256(0u64 as u256);
        
        set_deployed_at(&mut timelocks, u64_to_u256(deployed_at));
        
        // Verify deployed_at is set correctly
        let result = timelocks.value >> DEPLOYED_AT_OFFSET;
        assert!(result == u64_to_u256(deployed_at), 0);
    }

    #[test]
    fun test_rescue_start() {
        let deployed_at = 1000u64;
        let mut timelocks = from_u256(0u64 as u256);
        set_deployed_at(&mut timelocks, u64_to_u256(deployed_at));

        let rescue_delay = 500u64;
        let result = rescue_start(&timelocks, u64_to_u256(rescue_delay));

        let expected = u64_to_u256(deployed_at + rescue_delay);
        assert!(result == expected, 1);
    }

    #[test]
    fun test_get_single_stage() {
        let deployed_at = 5000u64;
        let dst_withdrawal_offset = 100u64; // stage 4

        // Set the offset for dst_withdrawal stage (stage 4)
        let packed_offsets = u64_to_u256(dst_withdrawal_offset) << (4 * 32);
        let mut timelocks = from_u256(packed_offsets);
        set_deployed_at(&mut timelocks, u64_to_u256(deployed_at));

        let result = get(&timelocks, dst_withdrawal());
        let expected = u64_to_u256(deployed_at + dst_withdrawal_offset);
        assert!(result == expected, 2);
    }

    #[test]
    fun test_get_zero_stage() {
        let deployed_at = 5000u64;

        let mut timelocks = from_u256(0u64 as u256);
        set_deployed_at(&mut timelocks, u64_to_u256(deployed_at));

        // Get a stage that has not been set, its offset is 0.
        let result = get(&timelocks, src_cancellation());
        let expected = u64_to_u256(deployed_at); // deployed_at + 0
        assert!(result == expected, 3);
    }

    #[test]
    fun test_get_with_multiple_stages_set() {
        // Test that each stage only considers its own offset, not others
        let deployed_at = 1000u64;
        let src_withdrawal_offset = 10u64; // stage 0
        let src_public_withdrawal_offset = 20u64; // stage 1
        let src_cancellation_offset = 30u64; // stage 2

        // Construct the packed u256 value with multiple stage offsets
        let packed_offsets = 
            (u64_to_u256(src_cancellation_offset) << (2 * 32)) |
            (u64_to_u256(src_public_withdrawal_offset) << 32) |
            u64_to_u256(src_withdrawal_offset);

        let mut timelocks = from_u256(packed_offsets);
        set_deployed_at(&mut timelocks, u64_to_u256(deployed_at));

        // Test each stage returns only its own offset
        let result_src_withdrawal = get(&timelocks, src_withdrawal());
        let expected_src_withdrawal = u64_to_u256(deployed_at + src_withdrawal_offset);
        assert!(result_src_withdrawal == expected_src_withdrawal, 4);

        let result_src_public_withdrawal = get(&timelocks, src_public_withdrawal());
        let expected_src_public_withdrawal = u64_to_u256(deployed_at + src_public_withdrawal_offset);
        assert!(result_src_public_withdrawal == expected_src_public_withdrawal, 5);

        let result_src_cancellation = get(&timelocks, src_cancellation());
        let expected_src_cancellation = u64_to_u256(deployed_at + src_cancellation_offset);
        assert!(result_src_cancellation == expected_src_cancellation, 6);
    }

    #[test]
    fun test_get_all_stages() {
        let deployed_at = 2000u64;
        
        // Set different offsets for all stages
        let offsets = vector[
            10u64, // src_withdrawal
            20u64, // src_public_withdrawal  
            30u64, // src_cancellation
            40u64, // src_public_cancellation
            50u64, // dst_withdrawal
            60u64, // dst_public_withdrawal
            70u64  // dst_cancellation
        ];

        let mut packed_offsets = 0u256;
        let mut i = 0;
        while (i < 7) {
            packed_offsets = packed_offsets | (u64_to_u256(*vector::borrow(&offsets, i)) << ((i as u8) * 32));
            i = i + 1;
        };

        let mut timelocks = from_u256(packed_offsets);
        set_deployed_at(&mut timelocks, u64_to_u256(deployed_at));

        // Test all stages
        let stages = vector[src_withdrawal(), src_public_withdrawal(), src_cancellation(), 
                           src_public_cancellation(), dst_withdrawal(), dst_public_withdrawal(), dst_cancellation()];
        
        let mut j = 0;
        while (j < 7) {
            let stage = *vector::borrow(&stages, j);
            let offset = *vector::borrow(&offsets, j);
            let result = get(&timelocks, stage);
            let expected = u64_to_u256(deployed_at + offset);
            assert!(result == expected, 7 + j);
            j = j + 1;
        };
    }

    #[test]
    fun test_large_values() {
        // Test with large values to ensure no overflow issues
        let deployed_at = 0xffffffffu64; // Max uint32
        let offset = 0xffffffffu64; // Max uint32
        
        let packed_offsets = u64_to_u256(offset);
        let mut timelocks = from_u256(packed_offsets);
        set_deployed_at(&mut timelocks, u64_to_u256(deployed_at));

        let result = get(&timelocks, src_withdrawal());
        let expected = u64_to_u256(deployed_at + offset);
        assert!(result == expected, 15);
    }
}
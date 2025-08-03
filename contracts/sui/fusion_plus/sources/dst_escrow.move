module fusion_plus::dst_escrow {
    use std::string::{String};
    use sui::tx_context::{Self, TxContext};
    use sui::sui::SUI;
    use sui::coin::{Self, Coin};
    use sui::transfer::{Self, Receiving};
    use fusion_plus::fusion_plus::FUSION_PLUS;
    use sui::balance::Balance;
    use fusion_plus::base_escrow::Immutables;
    use fusion_plus::base_escrow;
    use fusion_plus::timelocks;
    use sui::address;
    use sui::balance;
    use fusion_plus::events;

    const SALT: vector<u8> = b"DST_ESCROW";

    const ONLY_VALID_SAFETY_DEPOSIT: u64 = 201;
    const INVALID_CREATION_TIME: u64 = 202;

    public struct DstEscrow<phantom T> has key {
        id: UID,
        deterministic_id: address,
        rescue_delay: u32,
        balance: Balance<SUI>,
        token: Balance<T>,
    }

    public(package) fun new<T>(
        immutables: &mut Immutables,
        safety_deposit:  Option<Coin<SUI>>,
        token: Coin<T>,
        rescue_delay: u32,
        src_cancellation_time: u32,
        ctx: &mut TxContext
    ) : DstEscrow<T> {
        let block_timestamp_sec = (tx_context::epoch_timestamp_ms(ctx) as u256) / 1000;
        timelocks::set_deployed_at(base_escrow::borrow_mut_timelocks(immutables), block_timestamp_sec);

        let timelocks = base_escrow::borrow_timelocks(immutables);
        // Check that the escrow cancellation will start not later than the cancellation time on the source chain.
        assert!(
           timelocks::get(timelocks, timelocks::dst_cancellation()) <= src_cancellation_time as u256,
           INVALID_CREATION_TIME
        );

        let safety_deposit_value = base_escrow::safety_deposit(immutables);
        let hash = base_escrow::hash(immutables, SALT);
        let mut dst_escrow: DstEscrow<T> = DstEscrow { 
            id: object::new(ctx), 
            deterministic_id: address::from_bytes(hash),
            balance: balance::zero<SUI>(),
            token: coin::into_balance(token),
            rescue_delay
        };
        if(safety_deposit_value > 0) {
            assert!(
                option::is_some(&safety_deposit) && coin::value(option::borrow(&safety_deposit)) == safety_deposit_value, 
                ONLY_VALID_SAFETY_DEPOSIT
            );
            coin::put(&mut dst_escrow.balance, option::destroy_some( safety_deposit));
        } else {
            assert!(
                option::is_none(&safety_deposit), 
                ONLY_VALID_SAFETY_DEPOSIT
            );
            option::destroy_none(safety_deposit);
        };
        dst_escrow
    }
    

    public(package) fun public_share<T>(self: DstEscrow<T> ) {
        transfer::share_object(self)
    }

    public fun deterministic_id<T>(self: &DstEscrow<T> ) : address {
        self.deterministic_id
    }


    /**
     * @notice See {IBaseEscrow-withdraw}.
     * @dev The function works on the time intervals highlighted with capital letters:
     * ---- contract deployed --/-- finality --/-- PRIVATE WITHDRAWAL --/-- PUBLIC WITHDRAWAL --/-- private cancellation ----
     */
     public fun withdraw<T>(self: &mut DstEscrow<T>, secret: vector<u8>, immutables: &Immutables, ctx: &mut TxContext) {
        base_escrow::only_taker(immutables, ctx);
        let timelocks = base_escrow::borrow_timelocks(immutables);
        base_escrow::only_after(timelocks::get(timelocks, timelocks::dst_withdrawal()), ctx);
        base_escrow::only_before(timelocks::get(timelocks, timelocks::dst_cancellation()), ctx);

        withdraw_internal(self, secret, tx_context::sender(ctx), immutables, ctx);
     }


    /**
     * @notice See {IEscrowSrc-publicWithdraw}.
     * @dev The function works on the time interval highlighted with capital letters:
     * ---- contract deployed --/-- finality --/-- private withdrawal --/-- PUBLIC WITHDRAWAL --/--
     * --/-- private cancellation --/-- public cancellation ----
     */
    public fun public_withdraw<T>(self: &mut DstEscrow<T>, secret: vector<u8>, immutables: &Immutables, ctx: &mut TxContext) {
        base_escrow::only_access_token_holder(ctx);
        let timelocks = base_escrow::borrow_timelocks(immutables);
        base_escrow::only_after(timelocks::get(timelocks, timelocks::dst_public_withdrawal()), ctx);
        base_escrow::only_before(timelocks::get(timelocks, timelocks::dst_cancellation()), ctx);

        withdraw_internal(self, secret, address::from_u256(base_escrow::maker(immutables)), immutables, ctx);
    }

    /**
     * @notice See {IBaseEscrow-cancel}.
     * @dev The function works on the time interval highlighted with capital letters:
     * ---- contract deployed --/-- finality --/-- private withdrawal --/-- public withdrawal --/-- PRIVATE CANCELLATION ----
     */
    public fun cancel<T>(self: &mut DstEscrow<T>, immutables: &Immutables, ctx: &mut TxContext) {
        base_escrow::only_taker(immutables, ctx);
        base_escrow::only_valid_immutables(immutables, SALT, self.deterministic_id);
        let timelocks = base_escrow::borrow_timelocks(immutables);
        base_escrow::only_after(timelocks::get(timelocks, timelocks::dst_cancellation()), ctx);

        // safe transfer token to target
        let token_balance = balance::value<T>(&self.token);
        transfer::public_transfer( 
            coin::take(&mut self.token, token_balance, ctx), 
            address::from_u256(base_escrow::maker(immutables))
        );
        //sui transfer back to msg.sender  
        let sui_balance = balance::value<SUI>(&self.balance);
        if(sui_balance > 0) {
            transfer::public_transfer(coin::take(&mut self.balance, sui_balance, ctx), ctx.sender());
        };
        events::escrow_cancelled();
    }


    /**
     * @dev Transfers ERC20 (or native) tokens to the maker and native tokens to the caller.
     * @param immutables The immutable values used to deploy the clone contract.
     */
    fun withdraw_internal<T>(self: &mut DstEscrow<T>, secret: vector<u8>, target: address, immutables: &Immutables, ctx: &mut TxContext) {
        base_escrow::only_valid_immutables(immutables, SALT, self.deterministic_id);
        base_escrow::only_valid_secret(immutables, &secret);   

        // safe transfer token to target
        let token_balance = balance::value<T>(&self.token);
        transfer::public_transfer( coin::take(&mut self.token, token_balance, ctx), target);
        //sui transfer back to msg.sender  
        let sui_balance = balance::value<SUI>(&self.balance);
        if(sui_balance > 0) {
            // Ignoring warning as just transferring coin which will not create any issue
            transfer::public_transfer(coin::take(&mut self.balance, sui_balance, ctx), ctx.sender());
        };

        //TODO: will see if we need to delete the object (but it will not be deleted as it is shared)
        events::escrow_withdrawal(secret);
    }
}

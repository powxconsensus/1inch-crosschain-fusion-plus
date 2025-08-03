module fusion_plus::src_escrow {
    use fusion_plus::base_escrow::Immutables;
    use fusion_plus::base_escrow;
    use sui::address;
    use sui::coin::Coin;
    use sui::sui::SUI;
    use sui::balance::{Self, Balance};
    use sui::coin;
    use fusion_plus::timelocks;
    use fusion_plus::events;

    const SALT: vector<u8> = b"SRC_ESCROW";
    const ONLY_VALID_SAFETY_DEPOSIT: u64 = 501;

    public struct SrcEscrow<phantom T> has key {
        id: UID,
        deterministic_id: address,
        balance: Balance<SUI>,
        token: Balance<T>,
    }

    public(package) fun new<T>(
        immutables: &mut Immutables,
        safety_deposit:  Option<Coin<SUI>>,
        token: Coin<T>,
        ctx: &mut TxContext
    ) : SrcEscrow<T> {
        let block_timestamp_sec = (tx_context::epoch_timestamp_ms(ctx) as u256) / 1000;
        timelocks::set_deployed_at(base_escrow::borrow_mut_timelocks(immutables), block_timestamp_sec);

        let safety_deposit_value = base_escrow::safety_deposit(immutables);
        let hash = base_escrow::hash(immutables, SALT);
        let mut src_escrow: SrcEscrow<T> = SrcEscrow { 
            id: object::new(ctx), 
            deterministic_id: address::from_bytes(hash),
            balance: balance::zero<SUI>(),
            token: coin::into_balance(token)
        };
        if(safety_deposit_value > 0) {
            assert!(
                option::is_some(&safety_deposit) && coin::value(option::borrow(&safety_deposit)) == safety_deposit_value, 
                ONLY_VALID_SAFETY_DEPOSIT
            );
            coin::put(&mut src_escrow.balance, option::destroy_some( safety_deposit));
        } else {
            assert!(
                option::is_none(&safety_deposit), 
                ONLY_VALID_SAFETY_DEPOSIT
            );
            option::destroy_none(safety_deposit);
        };
        src_escrow
        //TODO: fill order in limit order book
    }

    public(package) fun public_share<T>(self: SrcEscrow<T> ) {
        transfer::share_object(self)
    }

    public fun deterministic_id<T>(self: &SrcEscrow<T> ) : address {
        self.deterministic_id
    }


    /**
     * @notice See {IBaseEscrow-withdraw}.
     * @dev The function works on the time interval highlighted with capital letters:
     * ---- contract deployed --/-- finality --/-- PRIVATE WITHDRAWAL --/-- PUBLIC WITHDRAWAL --/--
     * --/-- private cancellation --/-- public cancellation ----
     */
     public fun withdraw<T>(self: &mut SrcEscrow<T>, secret: vector<u8>, immutables: &Immutables, ctx: &mut TxContext) {
        base_escrow::only_taker(immutables, ctx);
        let timelocks = base_escrow::borrow_timelocks(immutables);
        base_escrow::only_after(timelocks::get(timelocks, timelocks::src_withdrawal()), ctx);
        base_escrow::only_before(timelocks::get(timelocks, timelocks::src_cancellation()), ctx);

        withdraw_internal(self, secret, tx_context::sender(ctx), immutables, ctx);
     }

    /**
     * @notice See {IEscrowSrc-withdrawTo}.
     * @dev The function works on the time interval highlighted with capital letters:
     * ---- contract deployed --/-- finality --/-- PRIVATE WITHDRAWAL --/-- PUBLIC WITHDRAWAL --/--
     * --/-- private cancellation --/-- public cancellation ----
     */
    public fun withdraw_to<T>(self: &mut SrcEscrow<T>, secret: vector<u8>, target: address, immutables: &Immutables, ctx: &mut TxContext) {
        base_escrow::only_taker(immutables, ctx);
        let timelocks = base_escrow::borrow_timelocks(immutables);
        base_escrow::only_after(timelocks::get(timelocks, timelocks::src_withdrawal()), ctx);
        base_escrow::only_before(timelocks::get(timelocks, timelocks::src_cancellation()), ctx);

        withdraw_internal(self, secret, tx_context::sender(ctx), immutables, ctx);
     }


    /**
     * @notice See {IEscrowSrc-publicWithdraw}.
     * @dev The function works on the time interval highlighted with capital letters:
     * ---- contract deployed --/-- finality --/-- private withdrawal --/-- PUBLIC WITHDRAWAL --/--
     * --/-- private cancellation --/-- public cancellation ----
     */
    public fun public_withdraw<T>(self: &mut SrcEscrow<T>, secret: vector<u8>, immutables: &Immutables, ctx: &mut TxContext) {
        base_escrow::only_access_token_holder(ctx);
        let timelocks = base_escrow::borrow_timelocks(immutables);
        base_escrow::only_after(timelocks::get(timelocks, timelocks::src_public_withdrawal()), ctx);
        base_escrow::only_before(timelocks::get(timelocks, timelocks::src_cancellation()), ctx);

        withdraw_internal(self, secret, address::from_u256(base_escrow::maker(immutables)), immutables, ctx);
    }

    /**
     * @notice See {IBaseEscrow-cancel}.
     * @dev The function works on the time intervals highlighted with capital letters:
     * ---- contract deployed --/-- finality --/-- private withdrawal --/-- public withdrawal --/--
     * --/-- PRIVATE CANCELLATION --/-- PUBLIC CANCELLATION ----
     */
    public fun cancel<T>(self: &mut SrcEscrow<T>, immutables: &Immutables, ctx: &mut TxContext) {
        base_escrow::only_taker(immutables, ctx);

        let timelocks = base_escrow::borrow_timelocks(immutables);
        base_escrow::only_after(timelocks::get(timelocks, timelocks::src_cancellation()), ctx);

        cancel_internal(self, immutables, ctx);
    }

    /**
     * @notice See {IEscrowSrc-publicCancel}.
     * @dev The function works on the time intervals highlighted with capital letters:
     * ---- contract deployed --/-- finality --/-- private withdrawal --/-- public withdrawal --/--
     * --/-- private cancellation --/-- PUBLIC CANCELLATION ----
     */
     public fun public_cancel<T>(self: &mut SrcEscrow<T>, immutables: &Immutables, ctx: &mut TxContext) {
        base_escrow::only_access_token_holder(ctx);
        let timelocks = base_escrow::borrow_timelocks(immutables);
        base_escrow::only_after(timelocks::get(timelocks, timelocks::src_public_cancellation()), ctx);

        cancel_internal(self, immutables, ctx);
    }

    /**
     * @dev Transfers ERC20 tokens to the target and native tokens to the caller.
     * @param secret The secret that unlocks the escrow.
     * @param target The address to transfer ERC20 tokens to.
     * @param immutables The immutable values used to deploy the clone contract.
     */
    fun withdraw_internal<T>(self: &mut SrcEscrow<T>, secret: vector<u8>, target: address, immutables: &Immutables, ctx: &mut TxContext) {
        base_escrow::only_valid_immutables(immutables, SALT, self.deterministic_id);
        base_escrow::only_valid_secret(immutables, &secret);   

        // safe transfer token to target
        let token_balance = balance::value<T>(&self.token);
        transfer::public_transfer( coin::take(&mut self.token, token_balance, ctx), target);
        //sui transfer back to msg.sender  
        let sui_balance = balance::value<SUI>(&self.balance);
        // Ignoring warning as just transferring coin which will not create any issue
        transfer::public_transfer(coin::take(&mut self.balance, sui_balance, ctx), ctx.sender());

        //TODO: will see if we need to delete the object (but it will not be deleted as it is shared)
        events::escrow_withdrawal(secret);
    }

    /**
     * @dev Transfers ERC20 tokens to the maker and native tokens to the caller.
     * @param immutables The immutable values used to deploy the clone contract.
     */
     fun cancel_internal<T>(self: &mut SrcEscrow<T>, immutables: &Immutables, ctx: &mut TxContext) {
        base_escrow::only_valid_immutables(immutables, SALT, self.deterministic_id);

        // safe transfer token to target
        let token_balance = balance::value<T>(&self.token);
        transfer::public_transfer( 
            coin::take(&mut self.token, token_balance, ctx), 
            address::from_u256(base_escrow::maker(immutables))
        );
        //sui transfer back to msg.sender  
        let sui_balance = balance::value<SUI>(&self.balance);
        transfer::public_transfer(coin::take(&mut self.balance, sui_balance, ctx), ctx.sender());

        events::escrow_cancelled();
     }
}

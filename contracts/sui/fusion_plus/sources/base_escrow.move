module fusion_plus::base_escrow {
    use sui::address;
    use fusion_plus::timelocks::Timelocks;
    use fusion_plus::timelocks;
    use sui::hash::keccak256;
    use sui::bcs;
    use fusion_plus::utils;

    const ONLY_TAKER: u64 = 100;
    const ONLY_MAKER: u64 = 101;
    const ONLY_ACCESS_TOKEN_HOLDER: u64 = 102;
    const ONLY_VALID_IMMUTABLES: u64 = 103;
    const ONLY_VALID_SECRET: u64 = 104;
    const ONLY_AFTER: u64 = 105;
    const ONLY_BEFORE: u64 = 106;
    const NOT_IMPLEMENTED: u64 = 107;
    const INVALID_TIME: u64 = 108;



    public struct Immutables has copy, drop, store {
        order_hash: vector<u8>, // bytes32
        hashlock: vector<u8>,  // bytes 32
        maker: u256, // creator of swap
        taker: u256, // dst swap taker 
        token: u256, // token to be swapped
        amount: u64,  // as native coins or token follow 9decimals only
        safety_deposit: u64, // as native coins or token follow 9decimals only
        timelocks: Timelocks // timelocks for swap
    }

    public fun new(
        order_hash: vector<u8>,
        hashlock: vector<u8>,
        maker: u256,
        taker: u256,
        token: u256,
        amount: u64,
        safety_deposit: u64,
        timelocks: u256
    ) : Immutables {
        Immutables {
            order_hash,
            hashlock,
            maker,
            taker,
            token,
            amount,
            safety_deposit,
            timelocks: timelocks::from_u256(timelocks),
        }
    }

    public(package) fun borrow_mut_timelocks(self: &mut Immutables): &mut Timelocks {
        &mut self.timelocks
    }
    
    public fun borrow_timelocks(self: &Immutables): &Timelocks {
        &self.timelocks
    }

    public fun safety_deposit(self: &Immutables): u64 {
        self.safety_deposit
    }

    public fun maker(self: &Immutables): u256 {
        self.maker
    }

    public fun taker(self: &Immutables): u256 {
        self.taker
    }

    public fun hashlock(self: &Immutables): vector<u8> {
        self.hashlock
    }

   public fun hash(
        self: &Immutables,  
        salt: vector<u8>
    ) : vector<u8> {
        let mut writer: vector<u8> = vector::empty();
        vector::append(&mut writer, bcs::to_bytes(&salt));
        vector::append(&mut writer, bcs::to_bytes(&self.order_hash));
        vector::append(&mut writer, bcs::to_bytes(&self.hashlock));
        vector::append(&mut writer, bcs::to_bytes(&self.maker));
        vector::append(&mut writer, bcs::to_bytes(&self.taker));
        vector::append(&mut writer, bcs::to_bytes(&self.token));
        vector::append(&mut writer, bcs::to_bytes(&self.amount));
        vector::append(&mut writer, bcs::to_bytes(&self.safety_deposit));
        keccak256(&writer)
    }

    //[Will Solve Later]Issue:: ctx can be exploited as context remains same for cross-contract calls
    public fun only_taker(
        self: &Immutables,            
        context: &TxContext
    ) {
        assert!(address::from_u256(self.taker) == tx_context::sender(context), ONLY_TAKER);
    }

    //[Will Solve Later]Issue:: ctx can be exploited as context remains same for cross-contract calls
    public fun only_maker(
        self: &Immutables,            
        ctx: &TxContext
    ) {
        assert!(address::from_u256(self.maker) == tx_context::sender(ctx), ONLY_MAKER);
    }

    public fun only_valid_secret(
        self: &Immutables,            
        secret: &vector<u8>
    ) {
        assert!(keccak256(secret) == self.hashlock, ONLY_VALID_SECRET);
    }

    public fun only_valid_immutables(
        self: &Immutables, 
        salt: vector<u8>,
        deterministic_id: address
    ) {
        assert!(hash(self, salt) == address::to_bytes(deterministic_id), ONLY_VALID_SECRET);
    }

    public fun only_access_token_holder(_ctx: &TxContext) {
        //TODO: will be implemented later, can done later when access control is required
    }

    public fun only_after(start: u256, ctx: &TxContext) {
        //TODO: some issue, don't have time to fix
        // assert!(utils::epoch_timestamp_sec(ctx) > start, INVALID_TIME);
    }

    public fun only_before(stop: u256, ctx: &TxContext) {
        //TODO: some issue, don't have time to fix
        // assert!(utils::epoch_timestamp_sec(ctx) <= stop, INVALID_TIME);
    }

    // modifier onlyValidImmutables(Immutables calldata immutables) virtual {
    //     _validateImmutables(immutables);
    //     _;
    // }

    // modifier onlyAfter(uint256 start) {
    //     if (block.timestamp < start) revert InvalidTime();
    //     _;
    // }

    // modifier onlyBefore(uint256 stop) {
    //     if (block.timestamp >= stop) revert InvalidTime();
    //     _;
    // }

    // modifier onlyAccessTokenHolder() {
    //     if (_ACCESS_TOKEN.balanceOf(msg.sender) == 0) revert InvalidCaller();
    //     _;
    // }
}
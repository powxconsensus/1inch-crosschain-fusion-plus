module fusion_plus::fusion_plus {
    use std::string::{String};
    use sui::tx_context::{Self, TxContext};
    use sui::sui::SUI;
    use sui::coin::{Self, Coin};
    use sui::transfer::{Self, Receiving};
    use sui::table::Table;
    use fusion_plus::base_escrow::Immutables;
    use fusion_plus::src_escrow;
    use fusion_plus::events;
    use fusion_plus::base_escrow;
    use fusion_plus::dst_escrow;
    use fusion_plus::timelocks;

    const ERR_ALREADY_INITIALIZE: u64 = 401;


    public struct OwnerCap has key, store {
        id: UID
    }

    public struct FusionPlus has key, store {
        id: UID,
        owner: address,
        rescue_delay_src: u32,
        rescue_delay_dst: u32,
        initialized: bool
    }

    // witness for init function
    public struct FUSION_PLUS has drop {}

    fun init(_witness: FUSION_PLUS, ctx: &mut TxContext) {
        let idx = object::new(ctx);
        let escrow_factory = FusionPlus { 
            id: idx, 
            owner: tx_context::sender(ctx), 
            rescue_delay_src: 0, 
            rescue_delay_dst: 0,
            initialized: false
        };
        transfer::share_object(escrow_factory);
        transfer::public_transfer(OwnerCap {
            id: object::new(ctx)
        }, tx_context::sender(ctx))
    }


    public fun initialize(
        self: &mut FusionPlus,
        _owner_cap: &mut OwnerCap,
        rescue_delay_src: u32,
        rescue_delay_dst: u32, 
        _ctx: &mut TxContext
    ) {
        assert!(!self.initialized, ERR_ALREADY_INITIALIZE);
        self.rescue_delay_dst = rescue_delay_dst;
        self.rescue_delay_src = rescue_delay_src;
        self.initialized = true;
        return
    }

    public fun create_src_escrow<T>(
        self: &mut FusionPlus,
        safety_deposit: Option<Coin<SUI>>,
        token: Coin<T>,
        mut immutables: Immutables,
        ctx: &mut TxContext
    ) {
        // create src escrow, share public share 
       let src_escrow= src_escrow::new(&mut immutables, safety_deposit, token, ctx);
        events::src_escrow_created(
            object::id_address(&src_escrow),
            src_escrow::deterministic_id(&src_escrow),
            base_escrow::maker(&immutables),
            base_escrow::hashlock(&immutables),
            timelocks::to_u256(base_escrow::borrow_timelocks(&immutables))

        );
        src_escrow::public_share(src_escrow)
    }



    public  fun create_dst_escrow<T>(
        self: &mut FusionPlus,
        safety_deposit: Option<Coin<SUI>>,
        token: Coin<T>,
        immutables: Immutables,
        src_cancellation_time: u32,
        ctx: &mut TxContext
    ) {

       let mut nimmutables = immutables;
        // create src escrow, and share it
       let dst_escrow= dst_escrow::new(
            &mut nimmutables, 
            safety_deposit, 
            token, 
            self.rescue_delay_dst, 
            src_cancellation_time,
            ctx
        );
        events::dst_escrow_created(
            object::id_address(&dst_escrow),
            dst_escrow::deterministic_id(&dst_escrow),
            base_escrow::hashlock(&immutables),
                        base_escrow::taker(&immutables),
            timelocks::to_u256(base_escrow::borrow_timelocks(&immutables))
        );
        dst_escrow::public_share(dst_escrow)
    }
}

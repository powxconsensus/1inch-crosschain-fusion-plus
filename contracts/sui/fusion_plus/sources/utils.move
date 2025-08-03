module fusion_plus::utils {
    use sui::hash::keccak256;
    use sui::tx_context::{Self, TxContext};

    public fun epoch_timestamp_sec(ctx: &TxContext): u256 {
        (tx_context::epoch_timestamp_ms(ctx) as u256) / 1000
    }
}

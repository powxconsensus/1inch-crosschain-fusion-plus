// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

module token::token {
    use sui::coin;

    public struct TOKEN has drop {}

    const DECIMALS: u8 = 6;
    const SYMBOL: vector<u8> = b"USDT";
    const NAME: vector<u8> = b"USDT";
    const DESCRIPTION: vector<u8> = b"Test USDT Token";
    const INITIAL_SUPPLY: u64 = 1000000000000000;

    fun init(_witness: TOKEN, ctx: &mut TxContext) {
        let (mut treasury_cap, metadata) = coin::create_currency(
            _witness,
            DECIMALS,
            SYMBOL,
            NAME,
            DESCRIPTION,
            option::none(),
            ctx
        );
        transfer::public_freeze_object(metadata);
        // 10^6 x 10^9
        coin::mint_and_transfer(&mut treasury_cap, INITIAL_SUPPLY, tx_context::sender(ctx), ctx);
        transfer::public_transfer(treasury_cap, tx_context::sender(ctx))
    }
}

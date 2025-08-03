module fusion_plus::events {
    use sui::event;

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // SrcEscrowCreated
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    public struct SrcEscrowCreated has drop, copy {
        escrow_id: address,
        deterministic_id: address,
        maker: u256,
        hashlock: vector<u8>,
        timelocks: u256
    }

    public(package) fun src_escrow_created(
        escrow_id: address,
        deterministic_id: address,
        maker: u256,
        hashlock: vector<u8>,
        timelocks: u256
    ) {
        event::emit(
            SrcEscrowCreated {
                escrow_id,
                deterministic_id,
                maker,
                hashlock,
                timelocks
            }
        )
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // DstEscrowCreated
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    public struct DstEscrowCreated has drop, copy {
        escrow_id: address,
        deterministic_id: address,
        hashlock: vector<u8>,
        taker: u256,
        timelocks: u256
    }

    public(package) fun dst_escrow_created(
        escrow_id: address,
        deterministic_id: address,
        hashlock: vector<u8>,
        taker: u256,
        timelocks: u256
    ) {
        event::emit(
            DstEscrowCreated {
                escrow_id,
                deterministic_id,
                hashlock,
                taker,
                timelocks
            }
        )
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // EscrowWithdrawal
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    public struct EscrowWithdrawal has drop, copy {
        secret: vector<u8>,
    }

    public(package) fun escrow_withdrawal(secret: vector<u8>) {
        event::emit(EscrowWithdrawal { secret } ) 
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // EscrowWithdrawal
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    public struct EscrowCancelled has drop, copy {}

    public(package) fun escrow_cancelled() {
        event::emit(EscrowCancelled {})
    }

     ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // FundsRescued
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    public struct FundsRescued has drop, copy {
        token: address,
        amount: u256
    }

    public(package) fun funds_rescued<T: store>(
        token: address,
        amount: u256
    ) {
        event::emit(FundsRescued {
            token,
            amount
        })
    }
}

use anchor_lang::prelude::*;

declare_id!("HWnyRt1yArSExqPY5p7eZfx2NaHePUt56d11gCjEF4oV");

#[program]
pub mod stratum_anchor {
    use super::*;

    pub fn anchor_window(
        ctx: Context<AnchorWindow>,
        window_id: String,
        merkle_root: [u8; 32],
        receipt_count: u64,
        gross_volume: u64,
        net_volume: u64,
    ) -> Result<()> {
        let anchor = &mut ctx.accounts.anchor_account;
        anchor.authority = ctx.accounts.authority.key();
        anchor.window_id = window_id;
        anchor.merkle_root = merkle_root;
        anchor.receipt_count = receipt_count;
        anchor.gross_volume = gross_volume;
        anchor.net_volume = net_volume;
        anchor.timestamp = Clock::get()?.unix_timestamp;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(window_id: String)]
pub struct AnchorWindow<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + AnchorAccount::INIT_SPACE,
        seeds = [b"stratum", window_id.as_bytes()],
        bump
    )]
    pub anchor_account: Account<'info, AnchorAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct AnchorAccount {
    pub authority: Pubkey,
    #[max_len(64)]
    pub window_id: String,
    pub merkle_root: [u8; 32],
    pub receipt_count: u64,
    pub gross_volume: u64,
    pub net_volume: u64,
    pub timestamp: i64,
}

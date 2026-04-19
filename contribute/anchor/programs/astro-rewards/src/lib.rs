use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount};

declare_id!("ASTRoXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX");

#[program]
pub mod astro_rewards {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let state = &mut ctx.accounts.state;
        state.authority = ctx.accounts.authority.key();
        state.total_contributions = 0;
        state.total_rewards_minted = 0;
        state.bump = ctx.bumps.state;
        Ok(())
    }

    pub fn submit_contribution(
        ctx: Context<SubmitContribution>,
        planet_name: String,
        data_field: String,
        data_hash: [u8; 32],
    ) -> Result<()> {
        require!(planet_name.len() <= 100, AstroError::NameTooLong);
        require!(data_field.len() <= 50, AstroError::FieldTooLong);

        let contribution = &mut ctx.accounts.contribution;
        contribution.contributor = ctx.accounts.contributor.key();
        contribution.planet_name = planet_name;
        contribution.data_field = data_field;
        contribution.data_hash = data_hash;
        contribution.status = ContributionStatus::Pending;
        contribution.reward_amount = 0;
        contribution.approvals = 0;
        contribution.rejections = 0;
        contribution.created_at = Clock::get()?.unix_timestamp;
        contribution.bump = ctx.bumps.contribution;

        let state = &mut ctx.accounts.state;
        state.total_contributions += 1;

        Ok(())
    }

    pub fn approve_contribution(
        ctx: Context<ApproveContribution>,
        reward_amount: u64,
    ) -> Result<()> {
        let contribution = &mut ctx.accounts.contribution;
        require!(
            contribution.status == ContributionStatus::Pending,
            AstroError::AlreadyReviewed
        );

        contribution.status = ContributionStatus::Approved;
        contribution.reward_amount = reward_amount;
        contribution.approvals += 1;

        Ok(())
    }

    pub fn claim_reward(ctx: Context<ClaimReward>) -> Result<()> {
        let contribution = &mut ctx.accounts.contribution;
        require!(
            contribution.status == ContributionStatus::Approved,
            AstroError::NotApproved
        );
        require!(contribution.reward_amount > 0, AstroError::NoReward);

        let amount = contribution.reward_amount;
        contribution.reward_amount = 0;
        contribution.status = ContributionStatus::Claimed;

        let state = &ctx.accounts.state;
        let seeds = &[b"state".as_ref(), &[state.bump]];
        let signer = &[&seeds[..]];

        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.contributor_token_account.to_account_info(),
                    authority: ctx.accounts.state.to_account_info(),
                },
                signer,
            ),
            amount,
        )?;

        let state = &mut ctx.accounts.state;
        state.total_rewards_minted += amount;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + ProgramState::INIT_SPACE,
        seeds = [b"state"],
        bump
    )]
    pub state: Account<'info, ProgramState>,

    #[account(
        init,
        payer = authority,
        mint::decimals = 6,
        mint::authority = state,
    )]
    pub mint: Account<'info, Mint>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(planet_name: String, data_field: String, data_hash: [u8; 32])]
pub struct SubmitContribution<'info> {
    #[account(
        init,
        payer = contributor,
        space = 8 + Contribution::INIT_SPACE,
        seeds = [b"contribution", contributor.key().as_ref(), &data_hash],
        bump
    )]
    pub contribution: Account<'info, Contribution>,

    #[account(
        mut,
        seeds = [b"state"],
        bump = state.bump
    )]
    pub state: Account<'info, ProgramState>,

    #[account(mut)]
    pub contributor: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ApproveContribution<'info> {
    #[account(
        mut,
        constraint = state.authority == authority.key() @ AstroError::Unauthorized
    )]
    pub contribution: Account<'info, Contribution>,

    #[account(
        seeds = [b"state"],
        bump = state.bump
    )]
    pub state: Account<'info, ProgramState>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct ClaimReward<'info> {
    #[account(
        mut,
        constraint = contribution.contributor == contributor.key() @ AstroError::Unauthorized
    )]
    pub contribution: Account<'info, Contribution>,

    #[account(
        mut,
        seeds = [b"state"],
        bump = state.bump
    )]
    pub state: Account<'info, ProgramState>,

    #[account(mut)]
    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        token::mint = mint,
        token::authority = contributor,
    )]
    pub contributor_token_account: Account<'info, TokenAccount>,

    pub contributor: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[account]
#[derive(InitSpace)]
pub struct ProgramState {
    pub authority: Pubkey,
    pub total_contributions: u64,
    pub total_rewards_minted: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Contribution {
    pub contributor: Pubkey,
    #[max_len(100)]
    pub planet_name: String,
    #[max_len(50)]
    pub data_field: String,
    pub data_hash: [u8; 32],
    pub status: ContributionStatus,
    pub reward_amount: u64,
    pub approvals: u8,
    pub rejections: u8,
    pub created_at: i64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum ContributionStatus {
    Pending,
    Approved,
    Rejected,
    Claimed,
}

#[error_code]
pub enum AstroError {
    #[msg("Planet name too long")]
    NameTooLong,
    #[msg("Data field name too long")]
    FieldTooLong,
    #[msg("Contribution already reviewed")]
    AlreadyReviewed,
    #[msg("Contribution not approved")]
    NotApproved,
    #[msg("No reward to claim")]
    NoReward,
    #[msg("Unauthorized")]
    Unauthorized,
}

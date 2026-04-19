# PRD: Solana-Powered Decentralized Science Contribution Platform

## Overview

When users view an exoplanet in astrodex with incomplete data (missing radius, mass, temperature, atmosphere, albedo), the app surfaces a "Contribute" prompt linking to a web app. Contributors submit observational data or analysis, which is peer-reviewed and rewarded via Solana smart contracts — creating a decentralized, incentivized scientific research platform.

## Problem Statement

- NASA's Exoplanet Archive has 5,800+ confirmed planets but most have significant data gaps
- Only ~70 planets have detected atmospheric molecules; ~200 have measured temperatures
- Traditional research is slow, gatekept, and underfunded for "filling in" known unknowns
- Citizen scientists have no structured way to contribute or be rewarded

## Architecture

```
astrodex (C++) ──HTTP──> Contribution API (Node/Express)
                              │
                              ├──> Supabase (PostgreSQL) ── contributions, reviews, users
                              │
                              ├──> Solana Program (Anchor) ── $ASTRO token rewards
                              │
                              └──> Contribution Web App (Vite + React)
                                        │
                                        └──> Solana Wallet (Phantom/Backpack)
```

### Data Flow

1. **astrodex** detects incomplete `ExoplanetData` (fields with `DataSource::AI_PREDICTED` or no value)
2. Shows "Help complete this planet's data" button with count of missing fields
3. Opens contribution web app URL: `contribute.astrodex.xyz/planet/{name}?missing=radius,albedo,atmosphere`
4. Web app shows known vs missing data in a clear two-column layout
5. Contributor submits data with source citation (paper DOI, observation log, dataset link)
6. Submission enters peer review queue (2 reviewers required)
7. On approval, Solana program mints $ASTRO tokens proportional to contribution rarity

---

## Priority Breakdown

### P0 — MVP (Hackathon Buildable, ~12 hours)

**US-1: "Contribute" button in astrodex**
- When viewing a planet, show missing field count in the DATA tab
- Button opens `contribute.astrodex.xyz/planet/{name}` in browser
- Acceptance: clicking "Contribute" opens web app with planet name pre-filled

**US-2: Contribution web app — data display**
- Page shows planet name, known data (green), missing data (red/empty)
- Known data pulled from astrodex's aggregated NASA + exoplanet.eu sources
- Acceptance: landing on `/planet/TRAPPIST-1 b` shows its real data with gaps highlighted

**US-3: Contribution submission form**
- Form fields for each missing data point (radius, mass, temp, atmosphere, albedo)
- Required: source citation (DOI, arXiv ID, or observation dataset URL)
- Optional: methodology description, confidence estimate
- Stored in Supabase `contributions` table
- Acceptance: submitting a contribution creates a DB record with status "pending_review"

**US-4: Solana wallet connection**
- Connect Phantom/Backpack wallet on contribution web app
- Store wallet pubkey with user profile
- Acceptance: wallet connects, pubkey displayed in profile

**US-5: Basic Solana reward program**
- Anchor program with `initialize`, `approve_contribution`, `claim_reward` instructions
- SPL token: $ASTRO (devnet mint)
- Fixed reward: 10 $ASTRO per approved contribution (MVP simplification)
- Acceptance: after admin approval, contributor can claim tokens to their wallet

### P1 — Enhanced Review & Rewards (Post-hackathon, ~1 week)

**US-6: Peer review system**
- Each contribution requires 2/3 reviewer approvals
- Reviewers are contributors with 5+ approved submissions (reputation-gated)
- Reviewers earn 2 $ASTRO per review completed
- Acceptance: contribution moves to "approved" only after 2 positive reviews

**US-7: Tiered reward system**
- Reward scales by data rarity:
  - Atmospheric composition detection: 50 $ASTRO (only ~70 planets have this)
  - Measured temperature: 25 $ASTRO (~200 planets)
  - Geometric albedo: 30 $ASTRO (~100 planets)
  - Mass/radius refinement: 10 $ASTRO (common but still valuable)
  - Orbital parameter update: 5 $ASTRO
- Bonus: first-ever data for a planet field = 2x multiplier
- Acceptance: rewards reflect the tier table on claim

**US-8: Contribution history & leaderboard**
- Profile page showing all contributions, statuses, earned tokens
- Global leaderboard by total contributions and tokens earned
- Acceptance: leaderboard renders top 50 contributors

**US-9: astrodex data refresh**
- After contribution is approved, astrodex can pull updated data
- API endpoint: `GET /api/planet/{name}/contributions?status=approved`
- astrodex shows "Community contributed" badge on data fields
- Acceptance: approved contribution appears in astrodex DATA tab with "Community" source

### P2 — Decentralized Governance (Future)

**US-10: On-chain review voting**
- Move peer review to Solana: reviewers stake $ASTRO to vote
- Slashing for consistently wrong reviews (disagrees with eventual consensus)
- Acceptance: review votes recorded as Solana transactions

**US-11: DAO governance for reward parameters**
- Token holders vote on reward tiers, reviewer thresholds
- Proposal/vote system via Realms or custom program

**US-12: Cross-reference with JWST/telescope data pipelines**
- Automated ingestion from MAST, ESO archives
- Auto-verify contributions against new telescope data

---

## Smart Contract Design

### Token: $ASTRO (SPL Token)

```
Mint authority: Program PDA
Total supply: uncapped (minted on reward)
Decimals: 6
Network: Solana devnet (MVP) → mainnet-beta
```

### Program Instructions (Anchor)

```rust
#[program]
pub mod astro_rewards {
    // Initialize the reward pool and mint
    pub fn initialize(ctx: Context<Initialize>) -> Result<()>

    // Submit a contribution (stores hash on-chain for provenance)
    pub fn submit_contribution(
        ctx: Context<SubmitContribution>,
        planet_name: String,
        data_field: String,      // "atmosphere", "albedo", etc.
        data_hash: [u8; 32],     // SHA-256 of the submitted data
    ) -> Result<()>

    // Reviewer approves/rejects (P1: requires reviewer reputation)
    pub fn review_contribution(
        ctx: Context<ReviewContribution>,
        contribution_id: u64,
        approved: bool,
    ) -> Result<()>

    // Claim reward tokens after approval
    pub fn claim_reward(ctx: Context<ClaimReward>, contribution_id: u64) -> Result<()>
}
```

### Accounts

```
ContributionAccount {
    contributor: Pubkey,
    planet_name: String,
    data_field: String,
    data_hash: [u8; 32],
    status: enum { Pending, Approved, Rejected },
    reward_amount: u64,
    reviewers: Vec<Pubkey>,
    approvals: u8,
    rejections: u8,
    created_at: i64,
}

ReputationAccount {
    user: Pubkey,
    total_contributions: u32,
    approved_contributions: u32,
    reviews_completed: u32,
    total_earned: u64,
}
```

### Reward Tiers (P1)

| Data Field | Base Reward | First-Ever Bonus | Rarity Score |
|---|---|---|---|
| atmosphere_composition | 50 $ASTRO | 2x | Planets with data: ~70/5800 |
| geometric_albedo | 30 $ASTRO | 2x | ~100/5800 |
| temp_measured_k | 25 $ASTRO | 2x | ~200/5800 |
| mass_earth | 10 $ASTRO | 1.5x | ~4000/5800 |
| radius_earth | 10 $ASTRO | 1.5x | ~4200/5800 |
| orbital_period | 5 $ASTRO | 1x | ~5500/5800 |

---

## API Design

### Contribution API (Node/Express + Supabase)

```
POST   /api/contributions
  Body: { planet_name, data_field, value, source_doi, methodology, wallet_pubkey }
  Returns: { contribution_id, status: "pending_review" }

GET    /api/planet/{name}
  Returns: { known_data: {...}, missing_fields: [...], community_contributions: [...] }

GET    /api/planet/{name}/contributions?status=approved
  Returns: [{ field, value, source, contributor, approved_at }]

POST   /api/reviews
  Body: { contribution_id, approved: bool, reviewer_wallet, notes }
  Returns: { review_id, contribution_status }

GET    /api/leaderboard?limit=50
  Returns: [{ wallet, display_name, contributions, tokens_earned }]

GET    /api/user/{wallet}
  Returns: { contributions: [...], reviews: [...], reputation_score, tokens_earned }
```

### astrodex → Web App Integration

In `Application.cpp`, add to planet DATA tab:
```cpp
// Count missing fields
int missingCount = 0;
std::string missingFields;
if (!exoData.radius_earth.hasValue()) { missingCount++; missingFields += "radius,"; }
if (!exoData.atmosphere_composition.hasValue()) { missingCount++; missingFields += "atmosphere,"; }
// ... etc

if (missingCount > 0) {
    ImGui::TextColored(ImVec4(1,0.8,0,1), "%d fields missing", missingCount);
    if (ImGui::Button("Help Complete This Planet's Data")) {
        std::string url = "https://contribute.astrodex.xyz/planet/" + exoData.name
                        + "?missing=" + missingFields;
        // Platform-specific browser open
        system(("open \"" + url + "\"").c_str());  // macOS
    }
}
```

---

## Security Considerations

### Sybil Resistance
- **MVP**: Admin-only approval (centralized but simple)
- **P1**: Reputation-gated reviewing (5+ approved contributions to become reviewer)
- **P2**: Stake-to-review with slashing for bad reviews
- Wallet-based identity (one wallet = one contributor, but nothing stops multiple wallets)

### Data Quality
- Required source citation (DOI/arXiv) for every submission
- Cross-reference against NASA TAP API for sanity checks (value within physical bounds)
- Automated bounds checking: mass 0.01-13000 M_E, radius 0.1-25 R_E, temp 50-10000K
- Duplicate detection: reject submissions for fields that already have approved data

### Smart Contract Security
- Program upgrade authority held by multisig (P2)
- Reward amounts set by program constants, not user input
- Contribution data hash on-chain prevents retroactive tampering
- No user-supplied arithmetic in reward calculation

---

## Tech Stack (MVP)

| Component | Technology |
|---|---|
| Contribution Web App | Vite + React + TailwindCSS |
| Wallet Integration | @solana/wallet-adapter-react |
| Backend API | Node.js + Express |
| Database | Supabase (PostgreSQL + Auth) |
| Smart Contract | Anchor (Rust) on Solana devnet |
| Token | SPL Token ($ASTRO) |
| astrodex Integration | ImGui button + system("open") |

---

## What's Buildable in 24 Hours

1. **Anchor program** with initialize + submit + approve + claim (3-4 hours)
2. **Contribution web app** with planet data display + form + wallet connect (4-5 hours)
3. **Express API** with Supabase for contributions storage (2-3 hours)
4. **astrodex "Contribute" button** in DATA tab (1 hour)
5. **Demo flow**: view planet → see missing data → submit contribution → admin approve → claim tokens (1 hour integration/testing)

Total: ~12-14 hours for a working demo with real Solana devnet transactions.

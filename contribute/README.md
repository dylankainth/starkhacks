# Pony Stark — Solana Science Contribution Platform

Web app for incentivized scientific data contributions to the exoplanet catalog. When astrodex shows a planet with missing data, users are directed here to submit observations, which are rewarded with $ASTRO tokens on Solana devnet.

## The Problem

NASA's Exoplanet Archive has 5,800+ confirmed planets, but most have significant data gaps. Only about 70 have detected atmospheric molecules. About 200 have measured temperatures. There is no structured way for citizen scientists to help fill these gaps or be rewarded for doing so.

## What It Does

1. **View planet data** -- shows known vs. missing fields for any exoplanet
2. **Submit contributions** -- form for observational data with required source citations (DOI, arXiv ID)
3. **Connect wallet** -- Phantom or Backpack wallet via Solana wallet-adapter
4. **Earn rewards** -- approved contributions are rewarded with $ASTRO SPL tokens on Solana devnet

## Tech Stack

- **React 19** + **TypeScript**
- **Vite 8** -- build tool and dev server
- **@solana/web3.js** -- Solana blockchain interaction
- **@solana/wallet-adapter-react** -- wallet connection (Phantom, Backpack, Solflare, etc.)
- **@solana/spl-token** -- SPL token operations for $ASTRO rewards
- Solana devnet

## Setup

```bash
cd contribute
npm install
```

> Note: This component is in early development. The core dependencies (Solana wallet adapter, SPL token, React) are installed. See `docs/PRD_solana_science.md` for the full product design and planned architecture.

## Planned Architecture

```
astrodex (C++) --HTTP--> Contribution API (Node/Express)
                              |
                              +---> Supabase (PostgreSQL)
                              |
                              +---> Solana Program (Anchor) -- $ASTRO token rewards
                              |
                              +---> This Web App (Vite + React)
                                        |
                                        +---> Solana Wallet (Phantom/Backpack)
```

## Reward Tiers (Planned)

| Data Field | Reward | Known Coverage |
|---|---|---|
| Atmosphere composition | 50 $ASTRO | ~70 / 5,800 planets |
| Geometric albedo | 30 $ASTRO | ~100 / 5,800 |
| Measured temperature | 25 $ASTRO | ~200 / 5,800 |
| Mass refinement | 10 $ASTRO | ~4,000 / 5,800 |
| Radius refinement | 10 $ASTRO | ~4,200 / 5,800 |
| Orbital period | 5 $ASTRO | ~5,500 / 5,800 |

First-ever data for a planet field earns a 2x multiplier.

## Integration with astrodex

When viewing a planet in astrodex with incomplete data, a "Help Complete This Planet's Data" button opens this web app with the planet name and missing fields pre-filled in the URL:

```
contribute.astrodex.xyz/planet/TRAPPIST-1%20b?missing=radius,albedo,atmosphere
```

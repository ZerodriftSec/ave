# PermissionGuard

PermissionGuard helps users understand who still controls a token contract, what powers they retain, and why that matters.

It combines AVE risk data with source-based AI analysis to turn contract control into a readable decision.

## Why it exists

A token can look liquid, popular, and safe while still giving privileged actors the ability to:

- mint supply
- blacklist wallets
- pause transfers
- upgrade implementation
- change balances or trading behavior

For most users, those are the real trust questions.

PermissionGuard exists to make them answerable in minutes.

## What it does

PermissionGuard supports two simple workflows:

1. Search by token name, symbol, or address
2. Analyze a contract directly by address and chain

For each selected contract, it can:

- fetch AVE-backed contract risk signals
- fetch token metadata and holder context
- retrieve verified source code when available
- run AI-based source analysis
- present a readable report focused on permissions, control, and practical user risk

## How it works

```text
User
  ↓
Search token or enter contract address
  ↓
Fetch AVE contract + token data
  ↓
Fetch verified source code
  ↓
Run AI source analysis
  ↓
Show a unified permission-risk report
```

AVE provides the machine-readable first pass.
PermissionGuard explains what those signals mean.

## Built with

- Next.js
- React
- TypeScript
- AVE API
- Etherscan-compatible source retrieval
- Anthropic-compatible model API
- Vercel Blob caching

## Run locally

### Requirements

- Node.js 20+
- npm

### Environment

Create `.env.local`:

```bash
AVE_API_KEY=***
ETHERSCAN_API_KEY=***
ANTHROPIC_API_KEY=***

# Optional
ANTHROPIC_BASE_URL=...
ANTHROPIC_MODEL=glm-4.7
BLOB_READ_WRITE_TOKEN=...
HTTPS_PROXY=...
HTTP_PROXY=...
```

### Start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Current scope

PermissionGuard is currently focused on fast, investigation-style contract review.

It works best when:

- AVE data is available for the target token
- verified source code exists on an Etherscan-compatible explorer
- the target contract fits an EVM-style source-analysis workflow

## Vision

PermissionGuard is built around a simple idea:

> The most useful security product is not the one with the most raw data. It is the one that makes hidden control understandable.

The long-term goal is to become a clear trust interface for onchain products — not just flagging that something may be risky, but showing exactly what power remains after deployment and what that means for users.

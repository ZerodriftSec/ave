# PermissionGuard

## Reading a token contract should not require reading Solidity

Crypto users are being asked to make high-stakes trust decisions in seconds.

A token launches, liquidity appears, social momentum builds, and people are expected to answer difficult questions almost instantly:
- Who can still control this contract?
- Can an admin freeze transfers, mint supply, or upgrade logic later?
- Is the risk static, or can it change after users have already entered?
- If something looks unusual, how should a non-auditor understand it?

That gap is where PermissionGuard lives.

PermissionGuard is a dynamic permission risk analysis and explanation tool for tokens and smart contracts. It helps users move beyond vague labels like “safe” or “risky” and understand the real operational question behind onchain trust:

> Who still has power over this contract, what can they do with that power, and what does that mean for users right now?

Instead of forcing people to inspect raw source code or manually interpret scattered security signals, PermissionGuard combines AVE’s structured contract risk telemetry with source-based AI explanation to produce a fast, readable, outward-facing risk review.

## Why now

The next generation of contract risk is not only about classic code exploits. Increasingly, the real danger comes from dynamic control.

In many tokens and protocols, the most important risk is not whether there is a textbook bug. It is whether a privileged actor can still:
- mint new supply
- blacklist users
- pause transfers
- modify balances
- change trading conditions
- upgrade the implementation behind a proxy
- transfer or hide ownership in ways ordinary users cannot easily track

This matters because users rarely read source code before acting. They rely on interfaces, social proof, and rough heuristics. That is often not enough.

A strong example is Drift-style operational risk around key and permission management. Even when a protocol is sophisticated, users and integrators still need clarity on questions like:
- Which wallet, multisig, or authority can execute sensitive actions?
- Are those permissions narrowly scoped or broadly dangerous?
- Could compromised keys, misconfigured permissions, or overpowered operators create downstream user risk?
- Is the protocol architecture minimizing trust, or merely hiding complexity behind better branding?

PermissionGuard is designed for exactly this reality: dynamic, permission-driven risk that sits between code, governance, admin operations, and user trust.

## What PermissionGuard is

PermissionGuard is a hackathon project focused on fast analysis and explanation of admin and permission risk in tokens and smart contracts.

It is not just another token scanner.

Traditional scanners often stop at a score, a badge, or a short list of flags. PermissionGuard goes one step further by translating those technical signals into a human-readable explanation of control.

Our product goal is simple:
- surface high-impact permission signals quickly
- explain what those permissions imply in plain English
- help users and judges understand whether a contract’s trust model is acceptable

The result is a workflow that is useful before a token purchase, before a protocol integration, during due diligence, or while investigating a suspicious contract.

## Product overview

PermissionGuard gives users two fast ways to investigate a token or contract:

1. Search by keyword, token name, symbol, or address
2. Analyze a contract directly by address and chain

From there, the product builds a combined risk view with two layers:

1. AVE-powered structured risk data
2. AI-powered source-code interpretation

Together, those layers answer both of the questions that matter most:
- What risk signals are already visible at the contract and token level?
- What does the verified source code imply about real admin power and implementation behavior?

## What the user sees

A PermissionGuard report is designed to feel readable, fast, and decision-oriented.

For a given token or contract, the user can quickly understand:
- AVE risk score
- token metadata and market context
- whether the contract appears to be a honeypot
- whether mint, blacklist, pause, proxy, self-destruct, or balance-modification powers exist
- who the owner or creator appears to be
- whether verified source code is available
- what the source code suggests about controllers, vulnerabilities, and permission design

The product does not only say “this is dangerous.” It explains why.

## Why AVE is central to the product

AVE is the core machine-readable security layer inside PermissionGuard.

It gives us three capabilities that are critical for a hackathon product built for real-world speed:

1. Real-time risk telemetry
AVE provides contract-level risk signals quickly enough to support live investigation rather than offline research.

2. Multi-chain consistency
AVE lets us work across major EVM ecosystems through a unified API rather than bespoke chain-by-chain logic.

3. Rich security indicators
AVE exposes detailed fields that are especially relevant for permission-driven risk analysis, including owner information, honeypot status, mint-related capabilities, blacklist-related capabilities, pause controls, proxy detection, hidden owner signals, and more.

That is why AVE is not just a background dependency in PermissionGuard. It is the foundation of our first-pass risk judgment.

## How PermissionGuard uses the AVE API

PermissionGuard uses AVE as the product’s live data engine.

### 1. Token search and discovery
Endpoint:
`GET /tokens?keyword={keyword}`

This powers the search experience when a user types a token symbol, name, or address. It lets PermissionGuard quickly surface possible matches across chains and move users into analysis with minimal friction.

### 2. Contract risk lookup
Endpoint:
`GET /contracts/{address}-{chain}`

This is the most important AVE endpoint for our core narrative. It provides the structured contract risk signals that help us identify potentially dangerous admin authority.

Examples of AVE fields used by the product include:
- `risk_score`
- `is_honeypot`
- `buy_tax`
- `sell_tax`
- `owner`
- `creator_address`
- `has_mint_method`
- `has_black_method`
- `has_white_method`
- `transfer_pausable`
- `is_proxy`
- `selfdestruct`
- `owner_change_balance`
- `can_take_back_ownership`
- `hidden_owner`
- `has_owner_removed_risk`
- `holders`
- `pair_lock_percent`
- `external_call`
- `trading_cooldown`
- `slippage_modifiable`
- `anti_whale_modifiable`

These are exactly the kinds of machine-readable signals that map well to PermissionGuard’s mission: understanding control.

### 3. Token metadata lookup
Endpoint:
`GET /tokens/{address}-{chain}`

This enriches the report with user-facing token and market context such as:
- name
- symbol
- decimals
- current price
- market cap
- FDV
- logo
- AVE-linked token risk context

This matters because users do not evaluate permission risk in isolation. They evaluate it relative to what they are buying, integrating, or researching.

### 4. Holder data lookup
Endpoint:
`GET /tokens/top100/{address}-{chain}`

This endpoint is included in our backend risk fetch bundle to support holder-related context. Even when the UI emphasizes permissions first, concentration and holder structure remain relevant to trust assessment.

### 5. Supported chain discovery
Endpoint:
`GET /supported_chains`

This gives PermissionGuard a clean path toward broader multi-chain support while preserving a unified product experience.

## What PermissionGuard adds on top of AVE

AVE gives us fast, structured, cross-chain risk signals.

PermissionGuard adds a second layer: explanation.

When verified source code is available, PermissionGuard:
- retrieves the source from Etherscan-compatible APIs
- analyzes the source with an LLM pipeline
- converts implementation details into a readable permission narrative
- identifies likely controllers and admin pathways
- summarizes vulnerabilities and operational concerns
- produces a recommendation that non-specialist users can understand

This is the heart of the product.

AVE tells us what risk indicators exist.
PermissionGuard explains what they mean.

## System architecture

PermissionGuard is built as a Next.js application with a simple, practical architecture suited for a fast-moving hackathon build.

### Architecture diagram

```text
User Interface (Next.js)
    ↓
┌──────────────────────────────────────────────┐
│               PermissionGuard               │
│                                              │
│  ┌──────────────┐     ┌──────────────────┐   │
│  │ Keyword      │     │ Direct Contract  │   │
│  │ Search       │     │ Lookup           │   │
│  └──────┬───────┘     └────────┬─────────┘   │
│         │                      │             │
│         └──────────────┬───────┘             │
│                        ↓                     │
└────────────────────────┼─────────────────────┘
                         ↓
             ┌─────────────────────────┐
             │ Parallel Data Retrieval │
             └───────┬─────────┬───────┘
                     │         │
          ┌──────────▼───┐   ┌─▼──────────────┐
          │   AVE API    │   │ Etherscan API  │
          │              │   │                │
          │ /tokens      │   │ verified       │
          │ /contracts   │   │ source fetch   │
          │ /tokens/meta │   └──────┬─────────┘
          └──────┬───────┘          │
                 │                  │
                 └────────┬─────────┘
                          ↓
             ┌─────────────────────────┐
             │ Processing & Rendering  │
             └──────────┬──────────────┘
                        │
      ┌─────────────────┼────────────────────┐
      │                 │                    │
┌─────▼─────┐   ┌───────▼────────┐   ┌───────▼──────────┐
│ AVE Risk  │   │ AI Source      │   │ Unified Report   │
│ Signals   │   │ Analysis       │   │ View             │
│           │   │                │   │                  │
│ • score   │   │ • permissions  │   │ • summary cards  │
│ • taxes   │   │ • controllers  │   │ • risk framing   │
│ • flags   │   │ • vulnerabilities │ │ • readable takeaways │
│ • holders │   │ • recommendations │ │                  │
└───────────┘   └────────────────┘   └──────────────────┘
```

### Frontend
The main interface lets a user:
- search for a token
- choose a contract directly by address and chain
- review summary risk information
- inspect deeper permission analysis when source code is available

### Backend integration layer
Internal API routes act as the orchestration layer between the frontend and external services.

Core routes include:
- `/api/scan` for token discovery through AVE
- `/api/security` for AVE risk, token, and holder data
- `/api/fetch-source` for verified source retrieval
- `/api/analyze-source` for AI-based source interpretation
- `/api/chains` for supported chain metadata

### External services
PermissionGuard currently combines:
- AVE for contract and token risk telemetry
- Etherscan-compatible APIs for verified source retrieval
- an Anthropic-compatible model pipeline for structured source analysis
- Vercel Blob for caching fetched source and AI analysis results

## User workflow

### Workflow 1: Search-first discovery
1. The user enters a keyword such as a token symbol or project name.
2. PermissionGuard queries AVE token search and returns matching contracts.
3. The user selects the relevant token and chain.
4. The app fetches AVE contract risk and token metadata.
5. In parallel, it attempts to retrieve verified source code.
6. If source is available, PermissionGuard runs AI analysis.
7. The user receives a combined permission-focused report.

### Workflow 2: Direct contract investigation
1. The user enters a contract address and chooses a chain.
2. PermissionGuard skips discovery and immediately analyzes that contract.
3. AVE risk signals and token metadata are fetched.
4. Verified source is retrieved when available.
5. AI turns the source into a readable explanation of control, risk, and likely vulnerabilities.

This workflow is especially useful for traders, researchers, and judges who want fast answers on a specific contract.

## Representative output

A strong hackathon project should not only describe what it does — it should make the output legible. A typical PermissionGuard result is meant to look like this:

```text
┌────────────────────────────────────────────────────────────┐
│ PEPE (PEPE)                                               │
│ 0x6982...1193                                             │
│ Ethereum                                                  │
│                                                            │
│ AI Risk Score: 25  |  CAUTION  |  AVE Score: 15           │
│                                                            │
│ Market Cap: $3.5B         Holders: 285,431                │
│ Buy Tax: 0%               Sell Tax: 0%                    │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ AVE RISK ANALYSIS                                         │
│ Real-time structured risk telemetry                       │
│                                                            │
│ Owner Address:        0x8a35...                           │
│ Creator Address:      0x96c5...                           │
│ Honeypot:             No                                  │
│ Mint Capability:      No                                  │
│ Blacklist Capability: Yes                                 │
│ Pause Capability:     Yes                                 │
│ Proxy Contract:       Yes                                 │
│ Hidden Owner Signal:  No                                  │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ ADMIN PERMISSION ANALYSIS                                 │
│ Source-based explanation                                  │
│                                                            │
│ Controller Type: Upgradeable Proxy + Admin Owner          │
│                                                            │
│ HIGH-RISK PERMISSIONS                                     │
│ • Transfer pause authority exists                         │
│ • Blacklist logic can restrict specific addresses         │
│ • Upgrade authority can modify implementation logic       │
│                                                            │
│ VULNERABILITIES / CONCERNS                                │
│ • Users depend on privileged operator behavior            │
│ • Governance and ownership changes can alter trust model  │
│                                                            │
│ RECOMMENDATION                                            │
│ Suitable only if users accept centralized admin control   │
└────────────────────────────────────────────────────────────┘
```

This kind of output is the point of the product: not just more data, but a fast trust decision interface.

## Example user workflows

### Example 1: Search-first token review

```text
1. User enters “PEPE”
   ↓
2. PermissionGuard calls AVE token search
   ↓
3. AVE returns PEPE contracts across multiple chains
   ↓
4. User selects Ethereum PEPE
   ↓
5. PermissionGuard fetches in parallel:
   - AVE contract risk data
   - AVE token metadata
   - holder-related data
   - verified source from Etherscan
   ↓
6. If source is available, AI analyzes admin permissions
   ↓
7. User receives a readable permission-focused report
```

### Example 2: Direct contract investigation

```text
1. User pastes a contract address
   ↓
2. User selects chain = Ethereum
   ↓
3. PermissionGuard directly fetches AVE risk data
   ↓
4. Verified source is retrieved if available
   ↓
5. AI interprets admin powers, controllers, and vulnerabilities
   ↓
6. User gets a fast decision-oriented report
```

## Why this matters for judges and users

PermissionGuard is not trying to replace a full audit.

It is trying to solve a more immediate and widespread problem: most users interact with contracts long before a formal audit report is found, read, or understood.

That creates a major product gap in Web3 security:
- scanners often surface labels without enough explanation
- audit reports are too heavy for fast decision-making
- source code is inaccessible to most users
- operational permission risk is often under-explained

PermissionGuard turns that gap into a product experience.

For judges, the value is clear:
- it tackles a real and growing category of onchain risk
- it uses AVE in a concrete, technically meaningful way
- it produces a user-facing output rather than an internal developer tool
- it combines structured security data with explainable AI to improve decision quality

For users, the value is even simpler:
- fewer blind trust decisions
- faster contract understanding
- clearer visibility into admin power and dynamic permission risk

## Design philosophy

PermissionGuard was built around one belief:

> The best security product for everyday onchain use is not the one with the most raw data. It is the one that makes hidden control understandable.

That is why our focus is permission risk, not just generic safety labels.

A contract can appear active, liquid, and popular while still preserving dangerous operator powers. If users cannot see those powers clearly, they are not really making informed decisions.

PermissionGuard exists to make those hidden powers legible.

## Performance and implementation choices

To keep the experience fast and resilient, PermissionGuard uses:
- parallel fetching for AVE risk, token metadata, and holder-related data
- graceful partial failure handling through `Promise.allSettled`
- caching for source code and AI analysis where available
- server-side integration boundaries so the browser does not need direct exposure to upstream APIs

These choices help the product stay responsive even when one part of the pipeline is incomplete.

## Current scope and limitations

PermissionGuard is already effective as a hackathon submission, but it is also intentionally pragmatic.

Current constraints include:
- AI source analysis depends on verified source code availability
- source retrieval is currently tied to Etherscan-compatible EVM workflows
- some AVE data returned by the backend is richer than what is currently surfaced in the UI
- partial upstream failures may still lead to partially populated reports

These are acceptable tradeoffs for a product whose core insight is already strong: permission risk explanation is valuable even in an initial version.

## Why PermissionGuard deserves to exist

Web3 has no shortage of data.
What it lacks is readable trust infrastructure.

PermissionGuard turns fragmented contract telemetry and complex implementation details into something users can actually act on. It helps answer the most important question in token risk analysis:

If this contract still has powerful admins, what can they do to me?

By combining AVE’s structured security signals with source-aware AI explanation, PermissionGuard offers a practical new interface for understanding dynamic permission risk.

That is why we believe it is a strong hackathon project:
- it addresses a real user problem
- it is technically grounded
- it demonstrates clear AVE integration
- it delivers a product, not just a backend capability
- and it points toward a future where onchain trust becomes easier to verify before users are harmed

## Environment and dependencies

Key environment variables used by the project include:
- `AVE_API_KEY`
- `ETHERSCAN_API_KEY`
- `ANTHROPIC_API_KEY`
- `ANTHROPIC_BASE_URL` optional
- `ANTHROPIC_MODEL` optional

## Final note

PermissionGuard is built for the moment just before trust is extended.

Before a user buys.
Before a team integrates.
Before an analyst recommends.
Before a judge asks whether this project solves something real.

Our answer is yes.

PermissionGuard makes dynamic permission risk visible, understandable, and actionable.
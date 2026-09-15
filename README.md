# FlipStack

An original two-player browser card game based on two-sided shedding mechanics. It uses the same architecture as the sibling Hanamikoji project: React, TypeScript, Vite, PeerJS/WebRTC, a host-authoritative game state, private player snapshots, local persistence, Vitest, Playwright, and a static Vercel deployment.

## Run locally

```sh
npm install
npm run dev
npm test
npm run build
npm run test:e2e
```

## Multiplayer architecture

The host browser owns and validates the full state. PeerJS Cloud introduces the two browsers, then moves and private snapshots travel through a WebRTC data channel. The guest receives only their hand and public table state. Host games and reserved guest tokens persist in local storage for reconnects.

No account, database, analytics, or runtime secret is required. The host must keep the table open. Some restrictive networks require a TURN relay; optional `VITE_TURN_URL`, `VITE_TURN_USERNAME`, and `VITE_TURN_CREDENTIAL` build variables are supported.

## Rules implemented

- 112 paired Day/Night cards and seven-card starting hands
- Match by active color, number, or symbol
- Day: Draw 1, Skip, Reverse, Flip, Wild, Wild +2
- Night: Draw 5, Skip All, Reverse, Flip, Wild, Wild Draw Color
- Draw-then-play-or-keep flow
- Last-card declaration with a two-card missed-call penalty
- Round scoring from cards remaining in the opponent's hand; first to 500 wins
- Rematches, practice bot, invitation links, reconnection, and seat reservation

## Original design

FlipStack has original branding, card layouts, palette, and interface artwork. It does not reproduce Mattel card art or claim affiliation with UNO or Mattel. Game mechanics are implemented independently.

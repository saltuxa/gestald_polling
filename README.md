# Gestald Vote

Twitch Extension MVP for live polls in Panel and Mobile views.

## Features

- One active poll per channel.
- 2-6 answer options.
- Broadcaster and moderator dashboard controls.
- Identity-linked viewer voting.
- One locked vote per Twitch user.
- Live updates through SSE.
- Two privacy modes:
  - `anonymous_choice`: voters are listed, choices are hidden.
  - `public_choice`: voters and their choices are listed.
- In-memory store behind a store interface for future PostgreSQL/Redis persistence.

## Setup

Create `.env`:

```env
TWITCH_EXTENSION_SECRET=your_twitch_extension_secret
PORT=3001
```

Install dependencies:

```bash
npm install
```

Run locally:

```bash
npm run dev
```

Client dev server: `http://localhost:5173`

EBS API: `http://localhost:3001`

Public legal pages:

- `/terms.html`
- `/privacy.html`

## Local Testing Without Twitch

Generate a local broadcaster token:

```bash
npm run dev:token -- --role=broadcaster --userId=broadcaster-1
```

Open dashboard:

```text
http://localhost:5173/dashboard.html?channelId=local-channel&role=broadcaster&userId=broadcaster-1&token=PASTE_TOKEN
```

Generate a viewer token:

```bash
npm run dev:token -- --role=viewer --userId=viewer-1
```

Open viewer:

```text
http://localhost:5173/panel.html?channelId=local-channel&role=viewer&userId=viewer-1&token=PASTE_TOKEN
```

## Checks

```bash
npm run typecheck
npm test
npm run build
```

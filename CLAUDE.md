# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This project (Twitch Emote and Copypasta App) allows the user to quickly use their favourite emotes and copypastas in Twitch chats.

Functional requirements:

- [x] Should allow user to maintain a list of favourite emotes per Twitch channel and post them to the chat.
- [x] Should work with official Twitch emotes (global and subscriber) BetterTTV, FrankerFaceZ and 7TV extension emotes.
- [x] Should allow user to maintain a list of favourite copypastas per Twitch channel and post them to the chat.
- [x] Should show live Twitch chat and be able to add emotes and copypastas from chat.

Technical requirements:

- [x] Should be a single-page web app that works across multiple deployment targets.
- [x] Should work without a backend (connect directly to Twitch APIs, store all settings locally).
- [x] Should use Svelte with SvelteKit.

### Deployment Targets

The app is designed to work across three distinct deployment scenarios:

1. **Mobile (Browser or PWA)**

    - Layout: Narrow/mobile-optimized layout
    - Storage: Browser localStorage

2. **Desktop in Tampermonkey iframe overlaid on twitch.tv**

    - Layout: Narrow/mobile-like layout
    - Storage: Tampermonkey userscript storage

3. **Desktop in regular browser**
    - Layout: Wide layout with chat panel sidebar
    - Storage: Tampermonkey userscript storage if installed, otherwise fall back to browser localStorage

## Views / routes

### Channel list (`/`)

- [x] If Twitch API key not configured, redirect to `/setup`.
- [x] Presents the user list of their followed Twitch channels.
    - [x] On click go to that channel's favourite emotes page (`/channel/<channel>`).

### Set-up (`/setup`)

- [x] Allows user to authenticate with Twitch using OAuth
- [x] Allows user to reset app state (mostly for debugging)

### Channel Navigation

All channel pages (`/channel/<channel>`, `/channel/<channel>/add`) share the same navigation bar with links to:

- [x] Channel list (`/`)
- [x] Current channel favorites (`/channel/<channel>`)
- [x] Add emotes (`/channel/<channel>/add`)

All channel pages show Twitch chat of that channel:

- [x] Live Twitch chat (with emotes).
- [x] Can manually type to chat, or type an emote/copypasta to be favourited.
- [x] Clicking a chat message adds/removes it from favourite emotes/copypastas.

### Favourite emotes & copypastas (`/channel/<channel>`)

- [x] Shows the user's favourited emotes and copypastas in a grid.
- [x] Clicking an emote/copypasta sends it to the chat.
- [x] Drag & drop functionality to reorder emotes and copypastas.
- [x] Drag & drop to trash zone to delete items from favourites.

### Adding favourite emotes (`/channel/<channel>/add`)

- [x] Shows all available emotes for the channel (Twitch, 7TV, BTTV, and FFZ).
- [x] Clicking an emote adds/removes it from favourites.
- [x] List is searchable by name.

# Development Commands

## Formatting

- `npm run format` - Format all code with Prettier
- `npm run format:check` - Check if code is properly formatted

## Other Commands

- `npm run dev` - Start development server (note: do not run this command as it's a persistent process - user already has it running)
- `npm run build` - Build for production
- `npm run check` - Type check with svelte-check

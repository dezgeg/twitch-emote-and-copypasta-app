# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This project allows the user to quickly use their favourite emotes and copypastas in Twitch chats.

Functional requirements:

- [ ] Should allow user to maintain a list of favourite emotes per Twitch channel and post them to the chat.
- [ ] Should work with both official Twitch emotes (global and subscriber) and 7TV extension emotes.

Technical requirements:

- [ ] Should be a single-page web app that works on mobile (primary usecase) and desktop (for development).
- [ ] Should work without a backend if possible (connect directly to Twitch APIs, store all settings in localStorage).
- [ ] Should use Svelte with SvelteKit.

## Views / routes

### Channel list (`/`)

- [ ] If Twitch API key not configured, redirect to `/setup`.
- [ ] Presents the user list of their followed Twitch channels.
    - [ ] On click go to that channel's favourite emotes page (`/channel/<channel>`).
- [ ] Navigation button to Set-up screen (`/setup`).

### Set-up (`/setup`)

- [ ] Allows the user to set their Twitch API key.
- [ ] Navigation button to Channel list screen (`/`).

### Favourite emotes (`/channel/<channel>')

- [ ] Shows the user their favourited emotes in a grid.
    - [ ] Clicking an emote sends it to the chat.
- [ ] Navigation button to Editing favourite emotes (`/channel/<channel>/edit`).
- [ ] Navigation button to Adding favourite emotes (`/channel/<channel>/add`).
- [ ] Navigation button to Channel list screen (`/`).

### Editing favourite emotes (`/channel/<channel>/edit')

- [ ] Shows the user their favourited emotes in a grid, plus a button to delete them.
- [ ] Navigation button back to channel's favourite emotes page (`/channel/<channel>`).

### Adding favourite emotes (`/channel/<channel>/add')

- [ ] Shows the streamer's all available emotes (both Twitch and 7TV).
    - [ ] Clicking an emote adds it to favourites.
    - [ ] List is searchable by name.
- [ ] Navigation button back to channel's favourite emotes page (`/channel/<channel>`).

# Development Commands

## Formatting

- `npm run format` - Format all code with Prettier
- `npm run format:check` - Check if code is properly formatted

## Other Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run check` - Type check with svelte-check

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This project (Twitch Emote and Copypasta App) allows the user to quickly use their favourite emotes and copypastas in Twitch chats.

Functional requirements:

- [x] Should allow user to maintain a list of favourite emotes per Twitch channel and post them to the chat.
- [x] Should work with both official Twitch emotes (global and subscriber) and 7TV extension emotes.
- [x] Also supports BetterTTV (BTTV) and FrankerFaceZ (FFZ) emotes.
- [x] Emotes are cached for better performance.
- [x] Actual Twitch API integration for sending chat messages.
- [ ] Should support copypastas (not yet implemented).

Technical requirements:

- [x] Should be a single-page web app that works on mobile (primary usecase) and desktop (for development).
- [x] Should work without a backend if possible (connect directly to Twitch APIs, store all settings in localStorage).
- [x] Should use Svelte with SvelteKit.

## Views / routes

### Channel list (`/`)

- [x] If Twitch API key not configured, redirect to `/setup`.
- [x] Presents the user list of their followed Twitch channels.
    - [x] On click go to that channel's favourite emotes page (`/channel/<channel>`).

### Set-up (`/setup`)

- [x] Provides secure Twitch OAuth authentication using OIDC implicit grant flow.
- [x] Shows user profile information and authentication status.
- [x] Provides fallback manual token input for advanced users.
- [x] Detailed setup instructions with links to Twitch Developer Console.
- [x] Automatic token validation and error handling.

### Channel Navigation

All channel pages (`/channel/<channel>`, `/channel/<channel>/add`, `/channel/<channel>/edit`) share the same navigation bar with links to:

- [x] Channel list (`/`)
- [x] Current channel favorites (`/channel/<channel>`)
- [x] Add emotes (`/channel/<channel>/add`)
- [x] Edit favorites (`/channel/<channel>/edit`)

### Favourite emotes & copypastas (`/channel/<channel>`)

- [x] Shows the user's favourited emotes in a grid.
- [x] Clicking an emote sends it to the chat via Twitch API.
- [x] Shows error notifications if chat message sending fails.
- [x] Integrated live chat panel showing recent chat messages.
- [x] Clicking a chat message adds/removes it from favourite copypastas.
- [x] Displays emotes in chat messages graphically instead of as text.
- [x] Real-time chat updates via WebSocket connection.
- [x] Auto-scrolling chat that respects user scroll position.
- [ ] Shows the user's favourited copypastas.
- [ ] Clicking a copypasta sends it to the chat via Twitch API.

### Editing favourites (`/channel/<channel>/edit`)

- [x] Shows the user's favourited emotes in a grid with drag & drop functionality.
- [x] Allows drag & drop to reorder emotes.
- [x] Allows drag & drop to trash can to delete emotes from favourites.
- [x] Live preview of reordering while dragging.
- [x] Touch/mobile support for drag and drop.
- [ ] Shows the user's favourited copypastas with similar drag & drop functionality.
- [ ] Allows drag & drop to reorder copypastas.
- [ ] Allows drag & drop to trash can to delete copypastas from favourites.

### Adding favourite emotes (`/channel/<channel>/add`)

- [x] Shows all available emotes for the channel (Twitch, 7TV, BTTV, and FFZ).
- [x] Clicking an emote adds/removes it from favourites.
- [x] List is searchable by name.
- [x] Shows emote count and search results.
- [x] Visual indicators for already favorited emotes.

## Additional Technical Features

### Authentication & Security

- [x] OAuth 2.0 OIDC implicit grant flow for secure authentication.
- [x] Automatic token validation and expiration handling.
- [x] CSRF protection with state parameter verification.
- [x] Secure token storage in browser localStorage.
- [x] Backward compatibility with manual API tokens.

### Performance Optimizations

- [x] In-memory caching of emote data to avoid redundant API calls.
- [x] Parallel loading of emote types (Twitch, 7TV, BTTV, FFZ) for faster performance.
- [x] Responsive grid layouts optimized for mobile and desktop.

### User Experience

- [x] Instagram-style tight grid layout for emotes.
- [x] Mobile-first responsive design with touch support.
- [x] Accessibility features with proper ARIA roles and keyboard navigation.
- [x] Visual feedback for drag operations and hover states.
- [x] Auto-saving of preferences to localStorage.

### Code Quality

- [x] TypeScript for type safety.
- [x] Svelte 5 with modern syntax and best practices.
- [x] Proper error handling and user feedback.
- [x] Clean component architecture with reusable EmoteCard component.
- [x] Zero compilation warnings or errors.

# Development Commands

## Formatting

- `npm run format` - Format all code with Prettier
- `npm run format:check` - Check if code is properly formatted

## Other Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run check` - Type check with svelte-check

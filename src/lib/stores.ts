import { persisted } from 'svelte-persisted-store';

// Persisted store for Twitch API key
export const twitchApiKey = persisted('twitchApiKey', '');
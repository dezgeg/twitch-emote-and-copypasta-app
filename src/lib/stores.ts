import { persisted } from "svelte-persisted-store";

// Persisted store for Twitch API key
export const twitchApiKey = persisted("twitchApiKey", "");

// Function to get a persisted store for favorites per channel
export function getFavoriteEmotesStore(channel: string) {
    return persisted(`favorites_${channel}`, [] as string[]);
}

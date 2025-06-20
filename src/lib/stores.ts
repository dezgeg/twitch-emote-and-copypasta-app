import { persisted } from "svelte-persisted-store";
import { writable } from "svelte/store";
import type { Emote } from "./emote-api";

// Persisted store for Twitch API key
export const twitchApiKey = persisted("twitchApiKey", "");

// Function to get a persisted store for favorites per channel
export function getFavoriteEmotesStore(channel: string) {
    return persisted(`favorites_${channel}`, [] as string[]);
}

// Function to get a persisted store for favorite copypastas per channel
export function getFavoriteCopypastasStore(channel: string) {
    return persisted(`copypastas_${channel}`, [] as string[]);
}

// Cache for emotes data per channel
const emotesCache = new Map<string, Map<string, Emote>>();

// Function to get or create emotes store for a channel
export function getEmotesStore(channel: string) {
    const cached = emotesCache.get(channel);
    if (cached) {
        return writable(cached);
    }
    return writable<Map<string, Emote>>(new Map());
}

// Function to set emotes cache
export function setEmotesCache(channel: string, emotes: Map<string, Emote>) {
    emotesCache.set(channel, emotes);
}

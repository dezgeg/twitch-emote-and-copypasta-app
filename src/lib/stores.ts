import { writable, derived } from "svelte/store";
import type { Emote } from "./emote-api";
import type { OAuthToken } from "./oauth";
import { extensionPersisted } from "./extension-persisted-store";

// Persisted store for OAuth token
export const oauthToken = extensionPersisted<OAuthToken | null>("oauthToken", null);

// Derived store that returns the current access token from OAuth
export const currentAccessToken = derived([oauthToken], ([$oauthToken]) => {
    // Return OAuth token if available and not expired
    if ($oauthToken && ($oauthToken.expires_at === null || Date.now() < $oauthToken.expires_at)) {
        return $oauthToken.access_token;
    }
    return null;
});

// Function to get a persisted store for favorites per channel
export function getFavoriteEmotesStore(channel: string) {
    return extensionPersisted(`favorites_${channel}`, [] as string[]);
}

// Function to get a persisted store for favorite copypastas per channel
export function getFavoriteCopypastasStore(channel: string) {
    return extensionPersisted(`copypastas_${channel}`, [] as string[]);
}

// Function to get a persisted store for emotes per channel
export function getEmotesStore(channel: string) {
    return extensionPersisted(`emotes_${channel}`, {} as Record<string, Emote>);
}

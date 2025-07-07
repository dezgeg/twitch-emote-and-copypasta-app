import { getUser } from "./twitch-api";
import { TWITCH_CLIENT_ID } from "./config";
import { getEmotesStore } from "./stores";
import { get } from "svelte/store";
import type { Writable } from "svelte/store";

export interface Emote {
    name: string;
    url: string;
    type: "twitch" | "7tv" | "bttv" | "ffz";
}

export interface EmoteDataStore extends Writable<Record<string, Emote>> {
    lazyFetch(apiKey: string): Promise<void>;
}

/**
 * Create an EmoteDataStore for a channel with lazy loading capabilities
 */
export function createEmoteDataStore(channel: string): EmoteDataStore {
    const store = getEmotesStore(channel);

    const emoteDataStore: EmoteDataStore = {
        // Delegate all store methods to the underlying store
        subscribe: store.subscribe,
        set: store.set,
        update: store.update,

        // Implement lazyFetch method
        async lazyFetch(apiKey: string): Promise<void> {
            const cachedEmotes = get(store);

            // If we have cached data, refresh in background
            if (Object.keys(cachedEmotes).length > 0) {
                // Background refresh (don't throw on error)
                fetchAndUpdateEmotes(apiKey, channel, store, false);
                return;
            }

            // No cached data, fetch synchronously and await
            await fetchAndUpdateEmotes(apiKey, channel, store);
        },
    };

    return emoteDataStore;
}

/**
 * Fetch emotes and update the store
 */
async function fetchAndUpdateEmotes(
    apiKey: string,
    channel: string,
    store: Writable<Record<string, Emote>>,
    throwOnError = true,
) {
    try {
        const emotesRecord = await loadEmotesData(apiKey, channel);
        store.set(emotesRecord);
    } catch (err) {
        const errorMsg = throwOnError ? "Error loading emotes:" : "Error refreshing emotes:";
        console.error(errorMsg, err);
        if (throwOnError) {
            throw err;
        }
    }
}

/**
 * Core logic to load emotes data
 */
async function loadEmotesData(apiKey: string, channel: string): Promise<Record<string, Emote>> {
    const emotesRecord: Record<string, Emote> = {};

    // Get broadcaster and current user info
    const broadcaster = await getUser(apiKey, channel);
    const currentUser = await getUser(apiKey);

    // Fetch all emote types in parallel
    const emoteResults = await Promise.all([
        loadTwitchEmotes(apiKey, broadcaster.id, currentUser.id),
        load7TVEmotes(broadcaster.id),
        loadBetterTTVEmotes(broadcaster.id),
        loadFFZEmotes(broadcaster.id),
    ]);

    // Add all emotes to the record, keyed by emote name
    for (const emotes of emoteResults) {
        for (const emote of emotes) {
            if (emotesRecord[emote.name]) {
                const existingEmote = emotesRecord[emote.name];
                // Only log if the emotes are actually different (not identical duplicates)
                if (existingEmote.url !== emote.url || existingEmote.type !== emote.type) {
                    console.log(
                        `Duplicate emote found: ${emote.name}\n` +
                            `  Existing: ${existingEmote.type} - ${existingEmote.url}\n` +
                            `  New:      ${emote.type} - ${emote.url}`,
                    );
                }
            } else {
                emotesRecord[emote.name] = emote;
            }
        }
    }

    return emotesRecord;
}

/**
 * Get an emote from a record by name, or return a placeholder emote if not found
 */
export function getEmoteOrPlaceholder(emotesRecord: Record<string, Emote>, name: string): Emote {
    const emote = emotesRecord[name];
    return (
        emote || {
            name,
            url: "", // Emote not found, show without image
            type: "twitch" as const,
        }
    );
}

/**
 * Helper function to build Twitch emote URL from template
 */
function buildTwitchEmoteUrl(template: string, emote: any): string {
    // Prefer animated format if available, otherwise use first available format
    const format = emote.format.includes("animated") ? "animated" : emote.format[0] || "static";
    return template
        .replace("{{id}}", emote.id)
        .replace("{{format}}", format)
        .replace("{{theme_mode}}", emote.theme_mode[0] || "light")
        .replace("{{scale}}", "2.0");
}

/**
 * Helper function to fetch and process Twitch emotes from a URL with pagination support
 */
async function fetchTwitchEmotes(url: URL, apiKey: string): Promise<Emote[]> {
    const headers = {
        Authorization: `Bearer ${apiKey}`,
        "Client-Id": TWITCH_CLIENT_ID,
    };

    const allEmotes: Emote[] = [];
    const currentUrl = url;

    try {
        while (true) {
            const response = await fetch(currentUrl, { headers });
            if (!response.ok) {
                break;
            }

            const data = await response.json();

            // Process emotes from current page
            const emotes = data.data.map((emote: any) => ({
                name: emote.name,
                url: buildTwitchEmoteUrl(data.template, emote),
                type: "twitch" as const,
            }));
            allEmotes.push(...emotes);

            // Check for next page
            const cursor = data.pagination?.cursor;
            if (!cursor) {
                break;
            }

            currentUrl.searchParams.set("after", cursor);
        }
    } catch (err) {
        console.error("Error fetching Twitch emotes:", err);
    }

    return allEmotes;
}

/**
 * Load Twitch emotes (global and user emotes)
 */
async function loadTwitchEmotes(
    apiKey: string,
    broadcasterId: string,
    userId: string,
): Promise<Emote[]> {
    const [globalEmotes, userSpecificEmotes] = await Promise.all([
        fetchTwitchEmotes(new URL("https://api.twitch.tv/helix/chat/emotes/global"), apiKey),
        fetchTwitchEmotes(
            new URL(
                `https://api.twitch.tv/helix/chat/emotes/user?broadcaster_id=${broadcasterId}&user_id=${userId}`,
            ),
            apiKey,
        ),
    ]);

    return globalEmotes.concat(userSpecificEmotes);
}

/**
 * Helper function to fetch and process 7TV emotes from a URL
 */
async function fetch7TVEmotes(url: string, keyPrefix: string): Promise<Emote[]> {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            if (response.status === 404) {
                console.log(`7TV ${keyPrefix} emotes not found (404)`);
            } else {
                console.warn(`7TV API returned ${response.status} for ${keyPrefix} emotes`);
            }
            return [];
        }

        const data = await response.json();
        const emotes = data.emotes || data.emote_set?.emotes;

        if (!emotes) {
            return [];
        }

        return emotes.map((emote: any) => ({
            name: emote.name,
            url: `https://cdn.7tv.app/emote/${emote.id}/2x.webp`,
            type: "7tv" as const,
        }));
    } catch (err) {
        console.log(
            `7TV ${keyPrefix} emotes not available:`,
            err instanceof Error ? err.message : "Unknown error",
        );
        return [];
    }
}

/**
 * Load 7TV emotes (global and channel emotes)
 */
async function load7TVEmotes(broadcasterId: string): Promise<Emote[]> {
    const [globalEmotes, channelEmotes] = await Promise.all([
        fetch7TVEmotes("https://7tv.io/v3/emote-sets/global", "global"),
        fetch7TVEmotes(`https://7tv.io/v3/users/twitch/${broadcasterId}`, "channel"),
    ]);

    return globalEmotes.concat(channelEmotes);
}

/**
 * Helper function to map BetterTTV emote data to Emote objects
 */
function mapBetterTTVEmotes(emotes: any[] | null | undefined, keyPrefix: string): Emote[] {
    if (!emotes) {
        return [];
    }

    return emotes.map((emote: any) => ({
        name: emote.code,
        url: `https://cdn.betterttv.net/emote/${emote.id}/2x`,
        type: "bttv" as const,
    }));
}

/**
 * Load BetterTTV emotes for a channel
 */
async function loadBetterTTVEmotes(broadcasterId: string): Promise<Emote[]> {
    const bttvEmotes: Emote[] = [];

    try {
        // Fetch both global and channel BetterTTV emotes in parallel
        const responses = await Promise.all([
            // Global BetterTTV emotes
            fetch("https://api.betterttv.net/3/cached/emotes/global"),
            // Channel BetterTTV emotes
            fetch(`https://api.betterttv.net/3/cached/users/twitch/${broadcasterId}`),
        ]);

        // Process global BTTV emotes
        if (responses[0].ok) {
            const globalData = await responses[0].json();
            bttvEmotes.push(...mapBetterTTVEmotes(globalData, "global"));
        }

        // Process channel BTTV emotes
        if (!responses[1].ok) {
            if (responses[1].status === 404) {
                // Channel doesn't have BetterTTV emotes set up - this is normal
                console.log(
                    `Channel (ID: ${broadcasterId}) does not have BetterTTV emotes configured`,
                );
            } else {
                console.warn(
                    `BetterTTV API returned ${responses[1].status} for channel (ID: ${broadcasterId})`,
                );
            }
        } else {
            const channelData = await responses[1].json();
            bttvEmotes.push(...mapBetterTTVEmotes(channelData.channelEmotes, "channel"));
            bttvEmotes.push(...mapBetterTTVEmotes(channelData.sharedEmotes, "shared"));
        }
    } catch (err) {
        // Network error or other issues - don't show error to user
        console.log(
            "BetterTTV emotes not available:",
            err instanceof Error ? err.message : "Unknown error",
        );
    }

    return bttvEmotes;
}

/**
 * Helper function to fetch and process FFZ emotes from a URL
 */
async function fetchFFZEmotes(url: URL, keyPrefix: string): Promise<Emote[]> {
    const response = await fetch(url);
    if (!response.ok) {
        return [];
    }

    const data = await response.json();
    const emotes: Emote[] = [];

    if (!data.sets) {
        return emotes;
    }

    Object.values(data.sets).forEach((set: any) => {
        if (!set.emoticons) {
            return;
        }

        const setEmotes = set.emoticons.map((emote: any) => ({
            name: emote.name,
            url: emote.urls["2"] || emote.urls["1"],
            type: "ffz" as const,
        }));
        emotes.push(...setEmotes);
    });

    return emotes;
}

/**
 * Load FrankerFaceZ emotes for a channel
 */
async function loadFFZEmotes(broadcasterId: string): Promise<Emote[]> {
    try {
        const [globalEmotes, channelEmotes] = await Promise.all([
            fetchFFZEmotes(new URL("https://api.frankerfacez.com/v1/set/global"), "global"),
            fetchFFZEmotes(
                new URL(`https://api.frankerfacez.com/v1/room/id/${broadcasterId}`),
                "channel",
            ),
        ]);

        return globalEmotes.concat(channelEmotes);
    } catch (err) {
        // Network error or other issues - don't show error to user
        console.log(
            "FrankerFaceZ emotes not available:",
            err instanceof Error ? err.message : "Unknown error",
        );
        return [];
    }
}

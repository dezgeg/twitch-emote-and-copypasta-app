import { getUser } from "./twitch-api";
import { TWITCH_CLIENT_ID } from "./config";

export interface Emote {
    name: string;
    url: string;
    type: "twitch" | "7tv" | "bttv" | "ffz";
    uniqueKey: string;
}

/**
 * Load all available emotes for a channel (global, user, 7TV, BetterTTV, and FrankerFaceZ emotes)
 */
export async function loadAllEmotes(apiKey: string, channel: string): Promise<Emote[]> {
    const allEmotes: Emote[] = [];

    try {
        // Get broadcaster and current user info
        const broadcaster = await getUser(apiKey, channel);
        const currentUser = await getUser(apiKey);

        // Fetch Twitch emotes (global + user)
        const twitchEmotes = await loadTwitchEmotes(apiKey, broadcaster.id, currentUser.id);
        allEmotes.push(...twitchEmotes);

        // Fetch 7TV emotes
        const seventvEmotes = await load7TVEmotes(broadcaster.id);
        allEmotes.push(...seventvEmotes);

        // Fetch BetterTTV emotes
        const bttvEmotes = await loadBetterTTVEmotes(broadcaster.id);
        allEmotes.push(...bttvEmotes);

        // Fetch FrankerFaceZ emotes
        const ffzEmotes = await loadFFZEmotes(broadcaster.id);
        allEmotes.push(...ffzEmotes);
    } catch (err) {
        console.error("Error loading emotes:", err);
        throw err;
    }

    return allEmotes;
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
            if (response.ok) {
                const data = await response.json();
                
                // Process emotes from current page
                const emotes = data.data.map((emote: any) => ({
                    name: emote.name,
                    url: buildTwitchEmoteUrl(data.template, emote),
                    type: "twitch" as const,
                    uniqueKey: `twitch-${emote.id}`,
                }));
                allEmotes.push(...emotes);

                // Check for next page
                const cursor = data.pagination?.cursor;
                if (cursor) {
                    currentUrl.searchParams.set('after', cursor);
                } else {
                    break;
                }
            } else {
                break;
            }
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
        fetchTwitchEmotes(new URL(`https://api.twitch.tv/helix/chat/emotes/user?broadcaster_id=${broadcasterId}&user_id=${userId}`), apiKey),
    ]);

    const allEmotes = globalEmotes.concat(userSpecificEmotes);
    
    // Deduplicate by uniqueKey
    const seen = new Set<string>();
    return allEmotes.filter(emote => {
        if (seen.has(emote.uniqueKey)) {
            return false;
        }
        seen.add(emote.uniqueKey);
        return true;
    });
}

/**
 * Load 7TV emotes for a channel
 */
async function load7TVEmotes(broadcasterId: string): Promise<Emote[]> {
    try {
        const response = await fetch(`https://7tv.io/v3/users/twitch/${broadcasterId}`);

        if (response.ok) {
            const data = await response.json();
            if (data.emote_set?.emotes) {
                return data.emote_set.emotes.map((emote: any) => ({
                    name: emote.name,
                    url: `https://cdn.7tv.app/emote/${emote.id}/2x.webp`,
                    type: "7tv" as const,
                    uniqueKey: `7tv-${emote.id}`,
                }));
            }
        } else if (response.status === 404) {
            // Channel doesn't have 7TV emotes set up - this is normal
            console.log(`Channel (ID: ${broadcasterId}) does not have 7TV emotes configured`);
        } else {
            console.warn(`7TV API returned ${response.status} for channel (ID: ${broadcasterId})`);
        }
    } catch (err) {
        // Network error or other issues - don't show error to user
        console.log(
            "7TV emotes not available:",
            err instanceof Error ? err.message : "Unknown error",
        );
    }

    return [];
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
            const globalEmotes = globalData.map((emote: any) => ({
                name: emote.code,
                url: `https://cdn.betterttv.net/emote/${emote.id}/2x`,
                type: "bttv" as const,
                uniqueKey: `bttv-global-${emote.id}`,
            }));
            bttvEmotes.push(...globalEmotes);
        }

        // Process channel BTTV emotes
        if (responses[1].ok) {
            const channelData = await responses[1].json();
            if (channelData.channelEmotes) {
                const channelEmotes = channelData.channelEmotes.map((emote: any) => ({
                    name: emote.code,
                    url: `https://cdn.betterttv.net/emote/${emote.id}/2x`,
                    type: "bttv" as const,
                    uniqueKey: `bttv-channel-${emote.id}`,
                }));
                bttvEmotes.push(...channelEmotes);
            }
            // Also include shared emotes
            if (channelData.sharedEmotes) {
                const sharedEmotes = channelData.sharedEmotes.map((emote: any) => ({
                    name: emote.code,
                    url: `https://cdn.betterttv.net/emote/${emote.id}/2x`,
                    type: "bttv" as const,
                    uniqueKey: `bttv-shared-${emote.id}`,
                }));
                bttvEmotes.push(...sharedEmotes);
            }
        } else if (responses[1].status === 404) {
            // Channel doesn't have BetterTTV emotes set up - this is normal
            console.log(`Channel (ID: ${broadcasterId}) does not have BetterTTV emotes configured`);
        } else {
            console.warn(
                `BetterTTV API returned ${responses[1].status} for channel (ID: ${broadcasterId})`,
            );
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

    if (data.sets) {
        Object.values(data.sets).forEach((set: any) => {
            if (set.emoticons) {
                const setEmotes = set.emoticons.map((emote: any) => ({
                    name: emote.name,
                    url: emote.urls["2"] || emote.urls["1"],
                    type: "ffz" as const,
                    uniqueKey: `ffz-${keyPrefix}-${emote.id}`,
                }));
                emotes.push(...setEmotes);
            }
        });
    }

    return emotes;
}

/**
 * Load FrankerFaceZ emotes for a channel
 */
async function loadFFZEmotes(broadcasterId: string): Promise<Emote[]> {
    try {
        const [globalEmotes, channelEmotes] = await Promise.all([
            fetchFFZEmotes(new URL("https://api.frankerfacez.com/v1/set/global"), "global"),
            fetchFFZEmotes(new URL(`https://api.frankerfacez.com/v1/room/id/${broadcasterId}`), "channel"),
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

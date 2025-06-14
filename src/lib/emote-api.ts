import { getUser } from "./twitch-api";
import { TWITCH_CLIENT_ID } from "./config";

export interface Emote {
    id: string;
    name: string;
    url: string;
    type: "twitch" | "7tv" | "bttv";
    source?: string;
}

/**
 * Load all available emotes for a channel (global, user, 7TV, and BetterTTV emotes)
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
    } catch (err) {
        console.error("Error loading emotes:", err);
        throw err;
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
    const twitchEmotes: Emote[] = [];

    try {
        // Fetch global and user emotes in parallel
        const responses = await Promise.all([
            // Global emotes
            fetch("https://api.twitch.tv/helix/chat/emotes/global", {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Client-Id": TWITCH_CLIENT_ID,
                },
            }),
            // User emotes (includes channel and subscriber emotes)
            fetch(
                `https://api.twitch.tv/helix/chat/emotes/user?broadcaster_id=${broadcasterId}&user_id=${userId}`,
                {
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        "Client-Id": TWITCH_CLIENT_ID,
                    },
                },
            ),
        ]);

        // Process global emotes
        if (responses[0].ok) {
            const globalData = await responses[0].json();
            const globalEmotes = globalData.data.map((emote: any) => ({
                id: `global_${emote.id}`,
                name: emote.name,
                url: emote.images.url_2x || emote.images.url_1x,
                type: "twitch" as const,
                source: "Global",
            }));
            twitchEmotes.push(...globalEmotes);
        }

        // Process user emotes
        if (responses[1].ok) {
            const userData = await responses[1].json();
            const userEmotes = userData.data.map((emote: any) => {
                // User emotes use template URL format
                const url = userData.template
                    .replace("{{id}}", emote.id)
                    .replace("{{format}}", emote.format[0] || "static")
                    .replace("{{theme_mode}}", emote.theme_mode[0] || "light")
                    .replace("{{scale}}", "2.0");

                return {
                    id: `user_${emote.id}`,
                    name: emote.name,
                    url,
                    type: "twitch" as const,
                    source: "Available",
                };
            });
            twitchEmotes.push(...userEmotes);
        }
    } catch (err) {
        console.error("Error loading Twitch emotes:", err);
    }

    return twitchEmotes;
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
                    id: emote.id,
                    name: emote.name,
                    url: `https://cdn.7tv.app/emote/${emote.id}/2x.webp`,
                    type: "7tv" as const,
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
            fetch(`https://api.betterttv.net/3/cached/users/twitch/${broadcasterId}`)
        ]);

        // Process global BTTV emotes
        if (responses[0].ok) {
            const globalData = await responses[0].json();
            const globalEmotes = globalData.map((emote: any) => ({
                id: emote.id,
                name: emote.code,
                url: `https://cdn.betterttv.net/emote/${emote.id}/2x`,
                type: "bttv" as const,
                source: "Global",
            }));
            bttvEmotes.push(...globalEmotes);
        }

        // Process channel BTTV emotes
        if (responses[1].ok) {
            const channelData = await responses[1].json();
            if (channelData.channelEmotes) {
                const channelEmotes = channelData.channelEmotes.map((emote: any) => ({
                    id: emote.id,
                    name: emote.code,
                    url: `https://cdn.betterttv.net/emote/${emote.id}/2x`,
                    type: "bttv" as const,
                    source: "Channel",
                }));
                bttvEmotes.push(...channelEmotes);
            }
            // Also include shared emotes
            if (channelData.sharedEmotes) {
                const sharedEmotes = channelData.sharedEmotes.map((emote: any) => ({
                    id: emote.id,
                    name: emote.code,
                    url: `https://cdn.betterttv.net/emote/${emote.id}/2x`,
                    type: "bttv" as const,
                    source: "Shared",
                }));
                bttvEmotes.push(...sharedEmotes);
            }
        } else if (responses[1].status === 404) {
            // Channel doesn't have BetterTTV emotes set up - this is normal
            console.log(`Channel (ID: ${broadcasterId}) does not have BetterTTV emotes configured`);
        } else {
            console.warn(`BetterTTV API returned ${responses[1].status} for channel (ID: ${broadcasterId})`);
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

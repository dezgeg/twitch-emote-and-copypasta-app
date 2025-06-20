import { TWITCH_CLIENT_ID } from "./config";

export interface TwitchUser {
    id: string;
    login: string;
    display_name: string;
    type: string;
    broadcaster_type: string;
    description: string;
    profile_image_url: string;
    offline_image_url: string;
    view_count: number;
    created_at: string;
}

export interface FollowedChannel {
    broadcaster_id: string;
    broadcaster_login: string;
    broadcaster_name: string;
}

export interface ChatMessage {
    id: string;
    user_id: string;
    user_login: string;
    user_name: string;
    message: string;
    timestamp: string;
    color?: string;
}

/**
 * Get user information from Twitch API
 * @param apiKey - Twitch API access token
 * @param login - User login name, or null/undefined to get current authenticated user
 * @throws Error if user not found or API request fails
 */
export async function getUser(apiKey: string, login?: string | null): Promise<TwitchUser> {
    const url = login
        ? `https://api.twitch.tv/helix/users?login=${login}`
        : "https://api.twitch.tv/helix/users";

    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Client-Id": TWITCH_CLIENT_ID,
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to get user info: ${response.status}`);
    }

    const userData = await response.json();
    const user = userData.data[0];

    if (!user) {
        throw new Error(login ? `User "${login}" not found` : "Current user not found");
    }

    return user;
}

/**
 * Get followed channels for the authenticated user
 * @param apiKey - Twitch API access token
 * @throws Error if API request fails
 */
export async function getFollowedChannels(apiKey: string): Promise<FollowedChannel[]> {
    // First get user info to get user ID
    const user = await getUser(apiKey);

    // Get followed channels
    const followsResponse = await fetch(
        `https://api.twitch.tv/helix/channels/followed?user_id=${user.id}`,
        {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Client-Id": TWITCH_CLIENT_ID,
            },
        },
    );

    if (!followsResponse.ok) {
        throw new Error(`Failed to get followed channels: ${followsResponse.status}`);
    }

    const followsData = await followsResponse.json();
    return followsData.data || [];
}

/**
 * Send a chat message to a Twitch channel
 * @param apiKey - Twitch API access token (must have chat:edit scope)
 * @param broadcasterLogin - Channel name to send message to
 * @param message - Message content to send
 * @throws Error if API request fails
 */
export async function sendChatMessage(
    apiKey: string,
    broadcasterLogin: string,
    message: string,
): Promise<void> {
    // Get current user info
    const user = await getUser(apiKey);

    // Get broadcaster info
    const broadcaster = await getUser(apiKey, broadcasterLogin);

    const response = await fetch("https://api.twitch.tv/helix/chat/messages", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Client-Id": TWITCH_CLIENT_ID,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            broadcaster_id: broadcaster.id,
            sender_id: user.id,
            message: message,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
            `Failed to send chat message: ${response.status} - ${errorData.message || response.statusText}`,
        );
    }
}

/**
 * Create an EventSub subscription for chat messages
 * @param apiKey - Twitch API access token (requires user:read:chat scope)
 * @param sessionId - WebSocket session ID from welcome message
 * @param broadcasterUserId - Channel owner's user ID
 * @param userUserId - Authenticated user's ID (for chat access)
 * @returns The subscription ID
 * @throws Error if API request fails
 */
export async function createChatSubscription(
    apiKey: string,
    sessionId: string,
    broadcasterUserId: string,
    userUserId: string,
): Promise<string> {
    const response = await fetch("https://api.twitch.tv/helix/eventsub/subscriptions", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Client-Id": TWITCH_CLIENT_ID,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            type: "channel.chat.message",
            version: "1",
            condition: {
                broadcaster_user_id: broadcasterUserId,
                user_id: userUserId,
            },
            transport: {
                method: "websocket",
                session_id: sessionId,
            },
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
            `Failed to create chat subscription: ${response.status} - ${errorData.message || response.statusText}`,
        );
    }

    const subscriptionData = await response.json();
    const subscriptionId = subscriptionData.data[0]?.id;

    if (!subscriptionId) {
        throw new Error("Failed to get subscription ID from response");
    }

    console.log("Chat subscription created successfully with ID:", subscriptionId);
    return subscriptionId;
}

/**
 * Delete an EventSub subscription
 * @param apiKey - Twitch API access token
 * @param subscriptionId - ID of subscription to delete
 * @throws Error if API request fails
 */
export async function deleteEventSubSubscription(
    apiKey: string,
    subscriptionId: string,
): Promise<void> {
    const response = await fetch(
        `https://api.twitch.tv/helix/eventsub/subscriptions?id=${subscriptionId}`,
        {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Client-Id": TWITCH_CLIENT_ID,
            },
        },
    );

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
            `Failed to delete subscription: ${response.status} - ${errorData.message || response.statusText}`,
        );
    }
}

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

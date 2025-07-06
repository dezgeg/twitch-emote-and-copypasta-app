import { base } from "$app/paths";

// Twitch API configuration
export const TWITCH_CLIENT_ID = "4iu9xwadj4m2hdbilfa7fxwaqrkz49";

// OAuth configuration
export const TWITCH_OAUTH_REDIRECT_URI =
    typeof window !== "undefined"
        ? `${window.location.origin}${base}/oauth`
        : "http://localhost:5173/oauth";

export const TWITCH_OAUTH_SCOPES = [
    "user:read:email",
    "user:read:follows",
    "user:read:chat",
    "user:write:chat",
    "user:read:emotes",
];

// You can get a Client ID by:
// 1. Go to https://dev.twitch.tv/console
// 2. Register your application
// 3. Set redirect URI to: {your-domain}/oauth
// 4. Copy the Client ID here

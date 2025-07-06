import { browser } from "$app/environment";
import { TWITCH_CLIENT_ID, TWITCH_OAUTH_REDIRECT_URI, TWITCH_OAUTH_SCOPES } from "./config";

export interface OAuthToken {
    access_token: string;
    token_type: string;
    expires_in: number; // Can be Infinity for non-expiring tokens
    expires_at: number; // Can be Infinity for non-expiring tokens
    scope: string[];
}

/**
 * Generate a random state parameter for OAuth security
 */
function generateState(): string {
    return (
        Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    );
}

/**
 * Store state in session storage for verification
 */
function storeState(state: string): void {
    if (browser) {
        sessionStorage.setItem("oauth_state", state);
    }
}

/**
 * Verify the state parameter matches what we stored
 */
function verifyState(state: string): boolean {
    if (!browser) return false;
    const storedState = sessionStorage.getItem("oauth_state");
    sessionStorage.removeItem("oauth_state");
    return storedState === state;
}

/**
 * Build the Twitch OAuth authorization URL
 */
export function buildAuthorizationUrl(): string {
    const state = generateState();
    storeState(state);

    const params = new URLSearchParams({
        client_id: TWITCH_CLIENT_ID,
        redirect_uri: TWITCH_OAUTH_REDIRECT_URI,
        response_type: "token",
        scope: TWITCH_OAUTH_SCOPES.join(" "),
        state: state,
        force_verify: "true",
    });

    return `https://id.twitch.tv/oauth2/authorize?${params.toString()}`;
}

/**
 * Initiate the OAuth flow by redirecting to Twitch
 */
export function initiateOAuth(): void {
    if (browser) {
        window.location.href = buildAuthorizationUrl();
    }
}

/**
 * Parse the OAuth callback response from the URL fragment
 */
export function parseOAuthCallback(): OAuthToken | null {
    if (!browser) return null;

    const fragment = window.location.hash.substring(1);
    if (!fragment) return null;

    const params = new URLSearchParams(fragment);

    const access_token = params.get("access_token");
    const token_type = params.get("token_type");
    const expires_in = params.get("expires_in");
    const scope = params.get("scope");
    const state = params.get("state");

    // Verify state parameter
    if (!state || !verifyState(state)) {
        throw new Error("Invalid state parameter - possible CSRF attack");
    }

    if (!access_token || !token_type) {
        return null;
    }

    // If expires_in is not provided, treat as non-expiring token
    const expiresInSeconds = expires_in ? parseInt(expires_in, 10) : Infinity;
    const expiresAt = expires_in ? Date.now() + expiresInSeconds * 1000 : Infinity;

    return {
        access_token,
        token_type,
        expires_in: expiresInSeconds,
        expires_at: expiresAt,
        scope: scope ? scope.split(" ") : [],
    };
}

/**
 * Check if a token is expired
 */
export function isTokenExpired(token: OAuthToken): boolean {
    return Date.now() >= token.expires_at;
}

/**
 * Check if a token is close to expiring (within 5 minutes)
 */
export function isTokenExpiringSoon(token: OAuthToken): boolean {
    const fiveMinutes = 5 * 60 * 1000;
    return Date.now() >= token.expires_at - fiveMinutes;
}

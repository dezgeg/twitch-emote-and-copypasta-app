import { browser } from "$app/environment";
import { get } from "svelte/store";
import { TWITCH_CLIENT_ID, TWITCH_OAUTH_REDIRECT_URI, TWITCH_OAUTH_SCOPES } from "./config";
import { extensionPersisted } from "./extension-persisted-store";

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

// OAuth state store that works across iframe/popup contexts
const oauthStateStore = extensionPersisted("oauth_state", null as string | null);

/**
 * Store state for verification (works across iframe/popup contexts)
 */
function storeState(state: string): void {
    if (browser) {
        oauthStateStore.set(state);
    }
}

/**
 * Verify the state parameter matches what we stored
 */
function verifyState(state: string): boolean {
    if (!browser) return false;
    const storedState = get(oauthStateStore);

    // Clear the stored state after verification
    oauthStateStore.set(null);

    return storedState === state;
}

/**
 * Build the Twitch OAuth authorization URL
 */
function buildAuthorizationUrl(): string {
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
 * Initiate the OAuth flow by redirecting to Twitch or opening in new window if in iframe
 */
export function initiateOAuth(): void {
    if (!browser) return;

    const authUrl = buildAuthorizationUrl();

    // Check if we're in an iframe (Tampermonkey context)
    if (window.self !== window.top) {
        // Open OAuth in new window for iframe context
        const popup = window.open(
            authUrl,
            "twitchOAuth",
            "width=500,height=700,scrollbars=yes,resizable=yes",
        );

        if (popup) {
            // Focus the popup window
            popup.focus();

            // Listen for the popup to complete OAuth and redirect back
            const checkClosed = setInterval(() => {
                if (popup.closed) {
                    clearInterval(checkClosed);
                    // Refresh the iframe to check for new token in URL
                    window.location.reload();
                }
            }, 1000);
        } else {
            // Popup blocked, fallback to direct navigation (will likely fail but worth trying)
            alert(
                "Popup was blocked. Please allow popups for this site and try again, or use the standalone app for OAuth.",
            );
        }
    } else {
        // Normal redirect for standalone app
        window.location.href = authUrl;
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

import { goto } from "$app/navigation";
import { base } from "$app/paths";
import { get } from "svelte/store";
import { currentAccessToken } from "./stores";

/**
 * Checks if user is authenticated and redirects to setup page if not.
 * Returns the access token if authenticated, or null if redirected.
 */
export function requireAuth(): string | null {
    const token = get(currentAccessToken);
    if (!token) {
        goto(`${base}/setup`);
        return null;
    }
    return token;
}

/**
 * Async version that can be used in async functions.
 * Throws an error with a specific message if not authenticated.
 */
export async function requireAuthAsync(): Promise<string> {
    const token = get(currentAccessToken);
    if (!token) {
        goto(`${base}/setup`);
        throw new Error("Authentication required - redirecting to setup");
    }
    return token;
}

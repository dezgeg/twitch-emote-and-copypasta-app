import { browser } from "$app/environment";

/**
 * Checks if the application is running inside an iframe
 */
export function isInIframe(): boolean {
    return browser && window.self !== window.top;
}

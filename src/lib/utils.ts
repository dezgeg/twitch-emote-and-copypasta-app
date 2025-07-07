import { browser } from "$app/environment";

/**
 * Checks if the application is running inside an iframe
 */
export function isInIframe(): boolean {
    return browser && window.self !== window.top;
}

/**
 * Toggles an item in an array - adds if not present, removes if present
 */
export function toggleInArray<T>(array: T[], item: T): T[] {
    const index = array.indexOf(item);
    if (index >= 0) {
        return array.filter((_, i) => i !== index);
    } else {
        return [...array, item];
    }
}

import { toast } from "@zerodevx/svelte-toast";

/**
 * Show an error notification
 */
export function showError(message: string) {
    toast.push(message, {
        theme: {
            "--toastBackground": "#dc3545",
            "--toastColor": "white",
            "--toastBarBackground": "#c82333",
        },
        duration: 4000,
    });
}

/**
 * Show a success notification
 */
export function showSuccess(message: string) {
    toast.push(message, {
        theme: {
            "--toastBackground": "#28a745",
            "--toastColor": "white",
            "--toastBarBackground": "#218838",
        },
        duration: 3000,
    });
}

/**
 * Show an info notification
 */
export function showInfo(message: string) {
    toast.push(message, {
        theme: {
            "--toastBackground": "#17a2b8",
            "--toastColor": "white",
            "--toastBarBackground": "#138496",
        },
        duration: 3000,
    });
}

/**
 * Legacy compatibility function - shows error notification
 * @deprecated Use showError, showSuccess, or showInfo instead
 */
export function showNotification(message: string) {
    showError(message);
}

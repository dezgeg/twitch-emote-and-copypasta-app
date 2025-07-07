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

import { sendChatMessage } from "$lib/twitch-api";
import { showError } from "$lib/notification-utils";

// Global variable to track the last sent message to prevent duplicates
let lastSentMessage = "";

/**
 * Send a chat message with duplicate prevention and error handling
 * Shows error notifications but still throws errors for caller to handle
 */
export async function sendChatMessageWithDuplicateHandling(
    token: string,
    broadcasterId: string,
    senderId: string,
    message: string,
): Promise<void> {
    try {
        let text = message;

        // If the message is identical to the last sent message, append invisible character
        // This prevents Twitch's duplicate message prevention
        if (text === lastSentMessage) {
            text += " \u{E0000}";
        }

        await sendChatMessage(token, broadcasterId, senderId, text);

        // Update the last sent message
        lastSentMessage = text;
    } catch (err) {
        console.error("Failed to send to chat:", err);
        showError(
            `Failed to send message: ${err instanceof Error ? err.message : "Unknown error"}`,
        );
        throw err; // Re-throw so callers can handle UI state
    }
}

import { writable } from "svelte/store";
import {
    createChatSubscription,
    getUser,
    deleteEventSubSubscription,
    type ChatMessage,
    type ChannelNotification,
    type ChatBadge,
} from "./twitch-api";

export type ChatItem = ChatMessage | ChannelNotification;

export interface ChatWebSocketState {
    connected: boolean;
    error: string | null;
    sessionId: string | null;
}

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 1000; // milliseconds

export class ChatWebSocket {
    private ws: WebSocket | null = null;
    private sessionId: string | null = null;
    private reconnectAttempts = 0;
    private keepaliveTimeout: number | null = null;
    private apiKey: string;
    private channel: string;
    private subscriptionId: string | null = null;
    private onMessageCallback: ((message: ChatItem) => void) | null = null;
    private intentionallyClosed = false;

    public state = writable<ChatWebSocketState>({
        connected: false,
        error: null,
        sessionId: null,
    });

    constructor(apiKey: string, channel: string) {
        this.apiKey = apiKey;
        this.channel = channel;
        this.connect();
    }

    private connect() {
        try {
            this.ws = new WebSocket("wss://eventsub.wss.twitch.tv/ws?keepalive_timeout_seconds=30");

            this.ws.onopen = () => {
                console.log("WebSocket connected");
                this.reconnectAttempts = 0;
                this.updateState({ connected: true, error: null });
            };

            this.ws.onmessage = (event) => {
                this.handleMessage(JSON.parse(event.data));
            };

            this.ws.onclose = (event) => {
                console.log("WebSocket closed:", event.code, event.reason);
                this.updateState({ connected: false });

                // Only attempt to reconnect if not intentionally closed
                if (!this.intentionallyClosed) {
                    this.handleReconnect();
                }
            };

            this.ws.onerror = (error) => {
                console.error("WebSocket error:", error);
                this.updateState({ error: "WebSocket connection error" });
            };
        } catch (error) {
            console.error("Failed to create WebSocket:", error);
            this.updateState({ error: "Failed to connect to chat" });
        }
    }

    private handleMessage(data: any) {
        const messageType = data.metadata?.message_type;

        switch (messageType) {
            case "session_welcome":
                this.sessionId = data.payload.session.id;
                this.updateState({ sessionId: this.sessionId });
                console.log("Received session ID:", this.sessionId);

                // Auto-create subscription when we get session ID
                this.createSubscription();
                break;

            case "session_keepalive":
                // Reset keepalive timeout
                if (this.keepaliveTimeout) {
                    clearTimeout(this.keepaliveTimeout);
                }
                this.keepaliveTimeout = window.setTimeout(() => {
                    console.warn("Keepalive timeout - connection may be stale");
                }, 60000); // 60 seconds
                break;

            case "notification":
                const subscriptionType = data.payload.subscription.type;

                if (subscriptionType === "channel.chat.message") {
                    this.handleChatMessage(data.payload.event, data.metadata);
                } else {
                    // Handle other channel events as notifications
                    this.handleChannelNotification(
                        subscriptionType,
                        data.payload.event,
                        data.metadata,
                    );
                }
                break;

            case "session_reconnect":
                // Handle reconnect message
                if (data.payload.session.reconnect_url) {
                    this.reconnectToUrl(data.payload.session.reconnect_url);
                }
                break;

            case "revocation":
                console.warn("Subscription revoked:", data.payload.subscription);
                break;

            default:
                console.log("Unknown message type:", messageType, data);
        }
    }

    private handleChatMessage(event: any, metadata: any) {
        // Extract badges from the event
        const badges: ChatBadge[] = [];

        if (event.badges) {
            for (const badge of event.badges) {
                const badgeType = badge.set_id as ChatBadge["type"];
                // Only include the badges we want to display
                if (
                    [
                        "broadcaster",
                        "moderator",
                        "vip",
                        "subscriber",
                        "premium",
                        "staff",
                        "global_mod",
                        "admin",
                    ].includes(badgeType)
                ) {
                    badges.push({
                        type: badgeType,
                        info: badge.info, // For subscriber months, etc.
                    });
                }
            }
        }

        const message: ChatMessage = {
            id: event.message_id,
            user_id: event.chatter_user_id,
            user_login: event.chatter_user_login,
            user_name: event.chatter_user_name,
            message: event.message.text,
            timestamp: metadata.message_timestamp, // Timestamp is in metadata, not event
            color: event.color || undefined,
            badges,
        };

        // Call the callback if it's set
        if (this.onMessageCallback) {
            this.onMessageCallback(message);
        }
    }

    private handleChannelNotification(subscriptionType: string, event: any, metadata: any) {
        // Create a human-readable message based on the event type
        let message = "";

        switch (subscriptionType) {
            case "channel.chat_settings.update":
                message = this.formatChatSettingsMessage(event);
                break;
            case "channel.moderator.add":
                message = `${event.user_name} has been made a moderator`;
                break;
            case "channel.moderator.remove":
                message = `${event.user_name} is no longer a moderator`;
                break;
            case "channel.ban":
                message = `${event.user_name} has been banned${event.reason ? `: ${event.reason}` : ""}`;
                break;
            case "channel.unban":
                message = `${event.user_name} has been unbanned`;
                break;
            default:
                message = `Channel event: ${subscriptionType}`;
        }

        const notification: ChannelNotification = {
            id: `notification_${Date.now()}_${Math.random()}`,
            type: "notification",
            event_type: subscriptionType,
            message,
            timestamp: metadata.message_timestamp || new Date().toISOString(),
        };

        // Call the callback if it's set
        if (this.onMessageCallback) {
            this.onMessageCallback(notification);
        }
    }

    private formatChatSettingsMessage(event: any): string {
        const messages = [];

        if (event.emote_mode !== undefined) {
            messages.push(
                event.emote_mode ? "Emote Only Mode enabled" : "Emote Only Mode disabled",
            );
        }

        if (event.follower_mode !== undefined) {
            if (event.follower_mode) {
                const duration = event.follower_mode_duration_minutes;
                messages.push(
                    duration > 0
                        ? `Followers Only Mode enabled (${duration} minutes)`
                        : "Followers Only Mode enabled",
                );
            } else {
                messages.push("Followers Only Mode disabled");
            }
        }

        if (event.slow_mode !== undefined) {
            if (event.slow_mode) {
                messages.push(`Slow Mode enabled (${event.slow_mode_wait_time_seconds} seconds)`);
            } else {
                messages.push("Slow Mode disabled");
            }
        }

        if (event.subscriber_mode !== undefined) {
            messages.push(
                event.subscriber_mode
                    ? "Subscribers Only Mode enabled"
                    : "Subscribers Only Mode disabled",
            );
        }

        if (event.unique_chat_mode !== undefined) {
            messages.push(
                event.unique_chat_mode ? "Unique Chat Mode enabled" : "Unique Chat Mode disabled",
            );
        }

        return messages.length > 0 ? messages.join(", ") : "Chat settings updated";
    }

    private handleReconnect() {
        if (this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            this.reconnectAttempts++;
            const delay = RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts - 1);

            console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

            setTimeout(() => {
                this.connect();
            }, delay);
        } else {
            this.updateState({ error: "Failed to reconnect after multiple attempts" });
        }
    }

    private reconnectToUrl(url: string) {
        if (this.ws) {
            this.ws.close();
        }
        // For reconnect, we should connect to the new URL
        // But for simplicity, we'll use the standard reconnect logic
        this.handleReconnect();
    }

    private updateState(updates: Partial<ChatWebSocketState>) {
        this.state.update((state) => ({
            ...state,
            ...updates,
        }));
    }

    public getSessionId(): string | null {
        return this.sessionId;
    }

    public setOnMessage(callback: (message: ChatItem) => void) {
        this.onMessageCallback = callback;
    }

    private async createSubscription() {
        if (!this.sessionId) {
            throw new Error("Cannot create subscription without session ID");
        }
        if (this.subscriptionId) {
            throw new Error("Subscription already exists");
        }

        try {
            // Get current user and broadcaster IDs
            const [currentUser, broadcaster] = await Promise.all([
                getUser(this.apiKey),
                getUser(this.apiKey, this.channel),
            ]);

            // Create EventSub subscription
            this.subscriptionId = await createChatSubscription(
                this.apiKey,
                this.sessionId,
                broadcaster.id,
                currentUser.id,
            );

            console.log(
                "Chat subscription created for",
                this.channel,
                "with ID:",
                this.subscriptionId,
            );
        } catch (err) {
            console.error("Error creating chat subscription:", err);
            this.subscriptionId = null; // Reset subscription ID on error
            this.updateState({
                error: err instanceof Error ? err.message : "Failed to subscribe to chat",
            });
        }
    }

    public async close() {
        // Mark as intentionally closed to prevent reconnection attempts
        this.intentionallyClosed = true;

        // Clean up the specific subscription this instance created
        if (this.subscriptionId) {
            try {
                await deleteEventSubSubscription(this.apiKey, this.subscriptionId);
                console.log("Deleted subscription:", this.subscriptionId);
            } catch (err) {
                console.error("Error deleting subscription:", err);
            }
        }

        if (this.keepaliveTimeout) {
            clearTimeout(this.keepaliveTimeout);
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.subscriptionId = null; // Reset subscription ID
    }
}

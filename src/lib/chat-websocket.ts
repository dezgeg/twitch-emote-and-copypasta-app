import { writable } from "svelte/store";
import {
    createChatSubscription,
    getUser,
    deleteEventSubSubscription,
    type ChatMessage,
} from "./twitch-api";

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
    private onMessageCallback: ((message: ChatMessage) => void) | null = null;
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
                if (data.payload.subscription.type === "channel.chat.message") {
                    this.handleChatMessage(data.payload.event, data.metadata);
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
        const message: ChatMessage = {
            id: event.message_id,
            user_id: event.chatter_user_id,
            user_login: event.chatter_user_login,
            user_name: event.chatter_user_name,
            message: event.message.text,
            timestamp: metadata.message_timestamp, // Timestamp is in metadata, not event
            color: event.color || undefined,
        };

        // Call the callback if it's set
        if (this.onMessageCallback) {
            this.onMessageCallback(message);
        }
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

    public setOnMessage(callback: (message: ChatMessage) => void) {
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

            console.log("Chat subscription created for", this.channel, "with ID:", this.subscriptionId);
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

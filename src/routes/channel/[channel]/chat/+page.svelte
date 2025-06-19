<script lang="ts">
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";
    import { onMount, onDestroy } from "svelte";
    import { getUser, createChatSubscription, getEventSubSubscriptions, deleteEventSubSubscription, type ChatMessage } from "$lib/twitch-api";
    import { twitchApiKey } from "$lib/stores";
    import { ChatWebSocket, type ChatWebSocketState } from "$lib/chat-websocket";
    import Spinner from "$lib/components/Spinner.svelte";
    import { base } from "$app/paths";

    let loading = $state(true);
    let error = $state("");
    let chatWS: ChatWebSocket | null = null;
    let subscriptionCreated = $state(false);
    let chatState = $state<ChatWebSocketState>({
        connected: false,
        messages: [],
        error: null,
        sessionId: null
    });

    let channel = $derived($page.params.channel);

    onMount(async () => {
        if (!$twitchApiKey) {
            goto(`${base}/setup`);
            return;
        }

        try {
            await initializeChat();
        } catch (err) {
            console.error("Error initializing chat:", err);
            error = err instanceof Error ? err.message : "Failed to initialize chat";
            loading = false;
        }
    });

    onDestroy(() => {
        if (chatWS) {
            chatWS.close();
        }
        subscriptionCreated = false; // Reset subscription flag
    });

    async function initializeChat() {
        // Create WebSocket connection
        chatWS = new ChatWebSocket();
        
        // Subscribe to state changes
        chatWS.state.subscribe(state => {
            chatState = state;
            
            // Only create subscription once when we have a session ID
            if (state.sessionId && !state.error && !subscriptionCreated) {
                createSubscription(state.sessionId);
            }
        });

        loading = false;
    }

    async function createSubscription(sessionId: string) {
        try {
            subscriptionCreated = true; // Mark as in progress to prevent duplicates
            
            // Get current user and broadcaster IDs
            const [currentUser, broadcaster] = await Promise.all([
                getUser($twitchApiKey),
                getUser($twitchApiKey, channel)
            ]);

            // Create EventSub subscription
            await createChatSubscription(
                $twitchApiKey,
                sessionId,
                broadcaster.id,
                currentUser.id
            );

            console.log("Chat subscription created for", channel);
        } catch (err) {
            console.error("Error creating chat subscription:", err);
            
            // If it's a "subscription already exists" error, that's actually fine
            if (err instanceof Error && err.message.includes("subscription already exists")) {
                console.log("Subscription already exists, continuing...");
            } else {
                subscriptionCreated = false; // Reset flag on actual error
                error = err instanceof Error ? err.message : "Failed to subscribe to chat";
            }
        }
    }

    function formatTimestamp(timestamp: string): string {
        return new Date(timestamp).toLocaleTimeString();
    }

    function formatConnectionStatus(): string {
        if (chatState.connected) {
            return chatState.sessionId ? "Connected • Subscribed" : "Connected • Setting up...";
        }
        return "Disconnected";
    }

    // Auto-scroll to bottom when new messages arrive
    $effect(() => {
        if (chatState.messages.length > 0) {
            const container = document.getElementById('messages-container');
            if (container) {
                container.scrollTop = container.scrollHeight;
            }
        }
    });

    // Debug function to clean up stale subscriptions
    async function cleanupSubscriptions() {
        try {
            const subscriptions = await getEventSubSubscriptions($twitchApiKey);
            console.log("Current subscriptions:", subscriptions);
            
            // Delete chat message subscriptions
            const chatSubscriptions = subscriptions.filter(sub => sub.type === "channel.chat.message");
            for (const sub of chatSubscriptions) {
                await deleteEventSubSubscription($twitchApiKey, sub.id);
                console.log("Deleted subscription:", sub.id);
            }
            
            subscriptionCreated = false; // Reset flag
        } catch (err) {
            console.error("Error cleaning up subscriptions:", err);
        }
    }
</script>

<svelte:head>
    <title>Twitch Emote and Copypasta App - {channel} Chat</title>
</svelte:head>

{#if loading}
    <Spinner />
{:else if error}
    <div class="error">
        <p>Error: {error}</p>
        <p>Note: Chat requires user:read:chat scope and active stream.</p>
        <button onclick={() => location.reload()}>Retry Connection</button>
    </div>
{:else}
    <div class="chat-container">
        <div class="chat-header">
            <h2>Live Chat - {channel}</h2>
            <div class="header-controls">
                <div class="connection-status" class:connected={chatState.connected}>
                    <span class="status-indicator"></span>
                    {formatConnectionStatus()}
                </div>
                <button class="cleanup-btn" onclick={cleanupSubscriptions} title="Clean up subscriptions">
                    🗑️
                </button>
            </div>
        </div>
        
        {#if chatState.error}
            <div class="error">
                <p>Chat error: {chatState.error}</p>
            </div>
        {/if}
        
        {#if chatState.messages.length === 0}
            <p class="no-messages">
                {#if chatState.connected}
                    Waiting for chat messages...
                {:else}
                    Connecting to chat...
                {/if}
            </p>
        {:else}
            <div class="messages" id="messages-container">
                {#each chatState.messages as message (message.id)}
                    <div class="message">
                        <div class="message-header">
                            <span class="username" style="color: {message.color || '#9146ff'}">{message.user_name}</span>
                            <span class="timestamp">{formatTimestamp(message.timestamp)}</span>
                        </div>
                        <div class="message-content">
                            {message.message}
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    </div>
{/if}

<style>
    .chat-container {
        max-width: 800px;
        margin: 0 auto;
        padding: 1rem;
        height: calc(100vh - 200px);
        display: flex;
        flex-direction: column;
    }

    .chat-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid var(--border-color);
    }

    .header-controls {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    h2 {
        margin: 0;
        color: var(--text-primary);
    }

    .connection-status {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
        color: var(--text-secondary);
    }

    .status-indicator {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #dc3545;
        animation: pulse 2s infinite;
    }

    .connection-status.connected .status-indicator {
        background: #28a745;
        animation: none;
    }

    @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.5; }
        100% { opacity: 1; }
    }

    .no-messages {
        text-align: center;
        color: var(--text-secondary);
        font-style: italic;
        margin: 2rem 0;
    }

    .messages {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        flex: 1;
        overflow-y: auto;
        padding-right: 0.5rem;
    }

    .message {
        padding: 0.75rem;
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        cursor: pointer;
        transition: background-color 0.2s ease;
        flex-shrink: 0;
    }

    .message:hover {
        background: var(--bg-tertiary);
    }

    .message-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
    }

    .username {
        font-weight: bold;
        font-size: 0.9rem;
    }

    .timestamp {
        font-size: 0.75rem;
        color: var(--text-secondary);
    }

    .message-content {
        color: var(--text-primary);
        line-height: 1.4;
        word-wrap: break-word;
    }

    .error {
        text-align: center;
        padding: 2rem;
        background: var(--bg-secondary);
        border: 1px solid #dc3545;
        border-radius: 8px;
        margin: 1rem 0;
    }

    .error p {
        margin-bottom: 0.5rem;
        color: var(--text-primary);
    }

    .error button {
        padding: 0.5rem 1rem;
        background: var(--accent-primary);
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        margin-top: 1rem;
    }

    .error button:hover {
        background: var(--accent-hover);
    }

    .cleanup-btn {
        background: transparent;
        border: 1px solid var(--border-color);
        border-radius: 4px;
        padding: 0.25rem 0.5rem;
        cursor: pointer;
        font-size: 0.875rem;
        color: var(--text-secondary);
        transition: all 0.2s ease;
    }

    .cleanup-btn:hover {
        background: var(--bg-tertiary);
        border-color: var(--accent-primary);
    }

    @media (max-width: 600px) {
        .chat-container {
            padding: 0.5rem;
            height: calc(100vh - 160px);
        }

        .chat-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
        }

        .message {
            padding: 0.5rem;
        }

        .message-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.25rem;
        }
    }
</style>
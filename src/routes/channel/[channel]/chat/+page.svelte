<script lang="ts">
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";
    import { onMount, onDestroy } from "svelte";
    import { twitchApiKey } from "$lib/stores";
    import { ChatWebSocket, type ChatWebSocketState } from "$lib/chat-websocket";
    import type { ChatMessage } from "$lib/twitch-api";
    import Spinner from "$lib/components/Spinner.svelte";
    import { base } from "$app/paths";

    let loading = $state(true);
    let error = $state("");
    let chatWS: ChatWebSocket | null = null;
    // svelte-ignore non_reactive_update
    let messagesContainer: HTMLDivElement;
    let messages = $state<ChatMessage[]>([]);
    let chatState = $state<ChatWebSocketState>({
        connected: false,
        error: null,
        sessionId: null,
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

    onDestroy(async () => {
        if (chatWS) {
            await chatWS.close();
        }
    });

    async function initializeChat() {
        // Create WebSocket connection with API key and channel
        chatWS = new ChatWebSocket($twitchApiKey, channel);

        // Set up message callback
        chatWS.setOnMessage((message) => {
            messages = [...messages.slice(-49), message]; // Keep last 50 messages
        });

        // Subscribe to state changes
        chatWS.state.subscribe((state) => {
            chatState = state;

            // Update local error state from WebSocket state
            if (state.error) {
                error = state.error;
            }
        });

        loading = false;
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
        if (messages.length > 0 && messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    });

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
            </div>
        </div>

        {#if chatState.error}
            <div class="error">
                <p>Chat error: {chatState.error}</p>
            </div>
        {/if}

        {#if messages.length === 0}
            <p class="no-messages">
                {#if chatState.connected}
                    Waiting for chat messages...
                {:else}
                    Connecting to chat...
                {/if}
            </p>
        {:else}
            <div class="messages" bind:this={messagesContainer}>
                {#each messages as message (message.id)}
                    <div class="message">
                        <div class="message-header">
                            <span class="username" style="color: {message.color || '#9146ff'}"
                                >{message.user_name}</span
                            >
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
        0% {
            opacity: 1;
        }
        50% {
            opacity: 0.5;
        }
        100% {
            opacity: 1;
        }
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

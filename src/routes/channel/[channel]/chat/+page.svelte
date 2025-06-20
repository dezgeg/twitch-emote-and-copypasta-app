<script lang="ts">
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";
    import { onMount, onDestroy } from "svelte";
    import { twitchApiKey, getFavoriteCopypastasStore } from "$lib/stores";
    import { ChatWebSocket, type ChatWebSocketState } from "$lib/chat-websocket";
    import type { ChatMessage } from "$lib/twitch-api";
    import { loadAllEmotes, type Emote } from "$lib/emote-api";
    import Spinner from "$lib/components/Spinner.svelte";
    import ChatMessageCard from "$lib/components/ChatMessageCard.svelte";
    import { base } from "$app/paths";

    let loading = $state(true);
    let error = $state("");
    let chatWS: ChatWebSocket | null = null;
    // svelte-ignore non_reactive_update
    let messagesContainer: HTMLDivElement;
    let messages = $state<ChatMessage[]>([]);
    let emotes = $state<Emote[]>([]);
    let chatState = $state<ChatWebSocketState>({
        connected: false,
        error: null,
        sessionId: null,
    });
    let isAtBottom = $state(true);

    let channel = $derived($page.params.channel);
    let favoriteCopypastasStore = $derived(getFavoriteCopypastasStore(channel));

    onMount(async () => {
        if (!$twitchApiKey) {
            goto(`${base}/setup`);
            return;
        }

        try {
            await Promise.all([initializeChat(), loadEmotes()]);
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

    async function loadEmotes() {
        try {
            emotes = await loadAllEmotes($twitchApiKey, channel);
        } catch (err) {
            console.error("Error loading emotes:", err);
            // Don't fail the whole initialization if emotes fail to load
        }
    }

    function formatConnectionStatus(): string {
        if (chatState.connected) {
            return chatState.sessionId ? "Connected • Subscribed" : "Connected • Setting up...";
        }
        return "Disconnected";
    }

    function toggleCopypasta(message: ChatMessage) {
        const existingIndex = $favoriteCopypastasStore.findIndex((cp) => cp === message.message);

        if (existingIndex >= 0) {
            // Remove from favorites
            favoriteCopypastasStore.update((copypastas) =>
                copypastas.filter((_, index) => index !== existingIndex),
            );
        } else {
            // Add to favorites
            favoriteCopypastasStore.update((copypastas) => [...copypastas, message.message]);
        }
    }

    function isCopypastaFavorited(messageText: string): boolean {
        return $favoriteCopypastasStore.includes(messageText);
    }

    function checkIfAtBottom() {
        if (!messagesContainer) return;
        const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
        // Consider "at bottom" if within 50px of the bottom to account for slight variations
        isAtBottom = scrollTop + clientHeight >= scrollHeight - 50;
    }

    function handleScroll() {
        checkIfAtBottom();
    }

    // Auto-scroll to bottom when new messages arrive, but only if user is at the bottom
    $effect(() => {
        if (messages.length > 0 && messagesContainer && isAtBottom) {
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
            <div class="messages" bind:this={messagesContainer} onscroll={handleScroll}>
                {#each messages as chatMessage (chatMessage.id)}
                    <ChatMessageCard
                        message={chatMessage.message}
                        timestamp={chatMessage.timestamp}
                        user_name={chatMessage.user_name}
                        color={chatMessage.color}
                        {emotes}
                        isFavorited={isCopypastaFavorited(chatMessage.message)}
                        onClick={() => toggleCopypasta(chatMessage)}
                    />
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
    }
</style>

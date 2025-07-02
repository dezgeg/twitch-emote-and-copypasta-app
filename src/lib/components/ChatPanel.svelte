<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { browser } from "$app/environment";
    import { twitchApiKey, getFavoriteCopypastasStore } from "$lib/stores";
    import { ChatWebSocket, type ChatWebSocketState } from "$lib/chat-websocket";
    import type { ChatMessage } from "$lib/twitch-api";
    import type { Emote } from "$lib/emote-api";
    import ChatMessageCard from "./ChatMessageCard.svelte";
    import Spinner from "./Spinner.svelte";

    interface Props {
        channel: string;
        emotes: Map<string, Emote>;
    }

    let { channel, emotes }: Props = $props();

    // Chat state
    let chatLoading = $state(true);
    let chatError = $state("");
    let chatWS: ChatWebSocket | null = null;
    let messagesContainer = $state<HTMLDivElement>();
    let messages = $state<ChatMessage[]>([]);
    let chatState = $state<ChatWebSocketState>({
        connected: false,
        error: null,
        sessionId: null,
    });
    let isAtBottom = $state(true);

    let favoriteCopypastasStore = $derived(getFavoriteCopypastasStore(channel));

    // Detect if running in iframe
    let isInIframe = $derived(browser && window.self !== window.top);

    onMount(() => {
        initializeChat();
    });

    onDestroy(async () => {
        if (chatWS) {
            await chatWS.close();
        }
    });

    // Chat functions
    async function initializeChat() {
        if (!$twitchApiKey) {
            chatError = "No API key configured";
            chatLoading = false;
            return;
        }

        try {
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
                    chatError = state.error;
                }
            });

            chatLoading = false;
        } catch (err) {
            console.error("Error initializing chat:", err);
            chatError = err instanceof Error ? err.message : "Failed to initialize chat";
            chatLoading = false;
        }
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

<div class="chat-container" class:iframe={isInIframe}>
    <div class="chat-header">
        <h3>💬 Live Chat</h3>
    </div>

    {#if chatLoading}
        <div class="chat-loading">
            <Spinner />
        </div>
    {:else if chatError}
        <div class="chat-error">
            <p>Chat error: {chatError}</p>
            <p class="chat-error-note">
                Note: Chat requires user:read:chat scope and active stream.
            </p>
            <button onclick={() => initializeChat()}>Retry Connection</button>
        </div>
    {:else}
        {#if chatState.error}
            <div class="chat-error">
                <p>Chat error: {chatState.error}</p>
            </div>
        {/if}

        {#if messages.length === 0}
            <div class="no-messages">
                <p>
                    {#if chatState.connected}
                        Waiting for chat messages...
                    {:else}
                        Connecting to chat...
                    {/if}
                </p>
            </div>
        {:else}
            <div class="chat-messages" bind:this={messagesContainer} onscroll={handleScroll}>
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
    {/if}
</div>

<style>
    .chat-container {
        background: var(--bg-secondary);
        border-top: 1px solid var(--border-color);
        display: flex;
        flex-direction: column;
        height: 300px;
        overflow: hidden;
        width: 100%;
    }

    .chat-header {
        padding: 0.5rem 1rem;
        background: var(--bg-primary);
        border-bottom: 1px solid var(--border-color);
        flex-shrink: 0;
    }

    .chat-header h3 {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
        color: var(--text-primary);
    }

    .chat-loading {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .chat-error {
        padding: 1rem;
        text-align: center;
        color: var(--text-primary);
    }

    .chat-error p {
        margin: 0.5rem 0;
    }

    .chat-error-note {
        font-size: 0.875rem;
        color: var(--text-secondary);
    }

    .chat-error button {
        padding: 0.5rem 1rem;
        background: var(--accent-primary);
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        margin-top: 1rem;
    }

    .chat-error button:hover {
        background: var(--accent-hover);
    }

    .no-messages {
        padding: 2rem 1rem;
        text-align: center;
        color: var(--text-secondary);
        font-style: italic;
    }

    .no-messages p {
        margin: 0;
    }

    .chat-messages {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 0.5rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        width: 100%;
        box-sizing: border-box;
    }

    /* Desktop layout - sidebar */
    @media (min-width: 1024px) {
        .chat-container:not(.iframe) {
            width: 400px;
            height: auto;
            border-top: none;
            border-left: 1px solid var(--border-color);
        }

        /* In iframe, keep mobile layout even on desktop */
        .chat-container.iframe {
            width: 100%;
            height: 250px;
            border-top: 1px solid var(--border-color);
            border-left: none;
        }
    }

    @media (max-width: 600px) {
        .chat-container {
            height: 250px;
        }
    }
</style>

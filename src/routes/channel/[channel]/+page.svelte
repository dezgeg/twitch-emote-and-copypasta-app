<script lang="ts">
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";
    import { onMount, onDestroy } from "svelte";
    import { loadAllEmotes, getEmoteOrPlaceholder, type Emote } from "$lib/emote-api";
    import { twitchApiKey, getFavoriteEmotesStore, getFavoriteCopypastasStore } from "$lib/stores";
    import { sendChatMessage, getUser, type ChatMessage } from "$lib/twitch-api";
    import { ChatWebSocket, type ChatWebSocketState } from "$lib/chat-websocket";
    import FetchStatus from "$lib/components/FetchStatus.svelte";
    import EmoteCard from "$lib/components/EmoteCard.svelte";
    import ChatMessageCard from "$lib/components/ChatMessageCard.svelte";
    import Spinner from "$lib/components/Spinner.svelte";
    import { base } from "$app/paths";

    let fetchStatus: any;
    let allEmotes = $state(new Map<string, Emote>());
    let broadcasterId = $state("");
    let senderId = $state("");
    let lastSentMessage = $state("");

    // Chat state
    let chatLoading = $state(true);
    let chatError = $state("");
    let chatWS: ChatWebSocket | null = null;
    let messagesContainer: HTMLDivElement;
    let messages = $state<ChatMessage[]>([]);
    let chatState = $state<ChatWebSocketState>({
        connected: false,
        error: null,
        sessionId: null,
    });
    let isAtBottom = $state(true);

    let channel = $derived($page.params.channel);
    let favoriteEmotesStore = $derived(getFavoriteEmotesStore(channel));
    let favoriteCopypastasStore = $derived(getFavoriteCopypastasStore(channel));

    onMount(async () => {
        fetchStatus.run(async () => {
            // Load emotes and user IDs in parallel
            await Promise.all([loadEmotes(), loadUserIds()]);
        });

        // Initialize chat separately (don't block main content)
        initializeChat();
    });

    onDestroy(async () => {
        if (chatWS) {
            await chatWS.close();
        }
    });

    async function loadEmotes() {
        try {
            // Fetch all available emotes
            allEmotes = await loadAllEmotes($twitchApiKey, channel);
        } catch (err) {
            console.error("Error fetching emote URLs:", err);
            // If API fails, allEmotes remains empty and getEmoteOrPlaceholder will handle it
        }
    }

    async function loadUserIds() {
        if (!$twitchApiKey) {
            goto(`${base}/setup`);
            return;
        }

        // Get current user and broadcaster info once and cache them
        const [currentUser, broadcaster] = await Promise.all([
            getUser($twitchApiKey),
            getUser($twitchApiKey, channel),
        ]);

        senderId = currentUser.id;
        broadcasterId = broadcaster.id;
    }

    async function sendToChat(item: { name: string; url: string } | string) {
        try {
            if (!$twitchApiKey) {
                throw new Error("No API key configured");
            }

            if (!broadcasterId || !senderId) {
                throw new Error("User information not loaded yet");
            }

            let text = typeof item === "string" ? item : item.name;

            // If the message is identical to the last sent message, append a space
            // This prevents Twitch's duplicate message prevention
            if (text === lastSentMessage) {
                text += " \u{E0000}";
            }

            await sendChatMessage($twitchApiKey, broadcasterId, senderId, text);
            lastSentMessage = text;
        } catch (err) {
            console.error("Failed to send to chat:", err);
            showNotification(
                `Failed to send message: ${err instanceof Error ? err.message : "Unknown error"}`,
            );
        }
    }

    function showNotification(message: string) {
        const notification = document.createElement("div");
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #dc3545;
            color: white;
            padding: 1rem;
            border-radius: 8px;
            z-index: 1000;
            font-size: 0.875rem;
            font-weight: bold;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            max-width: 300px;
            word-wrap: break-word;
        `;
        document.body.appendChild(notification);

        // Auto-remove notification after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

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

<svelte:head>
    <title>Twitch Emote and Copypasta App - {channel} Favorites</title>
</svelte:head>

<FetchStatus bind:this={fetchStatus} errorPrefix="Failed to load channel data">
    <div class="main-container">
        <div class="favorites-content">
            <div class="page-padding">
                <section class="emotes-section">
                    <div class="emotes-grid">
                        {#each $favoriteEmotesStore as emoteName (emoteName)}
                            {@const emote = getEmoteOrPlaceholder(allEmotes, emoteName)}
                            <EmoteCard {emote} mode="view" onClick={sendToChat} />
                        {:else}
                            <p>No favorite emotes yet.</p>
                        {/each}
                    </div>
                </section>

                <hr class="section-separator" />

                <section class="copypastas-section">
                    <div class="copypastas-list">
                        {#each $favoriteCopypastasStore as copypasta (copypasta)}
                            <ChatMessageCard
                                message={copypasta}
                                emotes={allEmotes}
                                onClick={sendToChat}
                            />
                        {:else}
                            <p>No favorite copypastas yet.</p>
                        {/each}
                    </div>
                </section>
            </div>
        </div>

        <div class="chat-container">
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
                    <div
                        class="chat-messages"
                        bind:this={messagesContainer}
                        onscroll={handleScroll}
                    >
                        {#each messages as chatMessage (chatMessage.id)}
                            <ChatMessageCard
                                message={chatMessage.message}
                                timestamp={chatMessage.timestamp}
                                user_name={chatMessage.user_name}
                                color={chatMessage.color}
                                emotes={allEmotes}
                                isFavorited={isCopypastaFavorited(chatMessage.message)}
                                onClick={() => toggleCopypasta(chatMessage)}
                            />
                        {/each}
                    </div>
                {/if}
            {/if}
        </div>
    </div>
</FetchStatus>

<style>
    .main-container {
        display: flex;
        flex-direction: column;
        height: calc(100vh - var(--nav-height, 1cm));
    }

    .favorites-content {
        flex: 1;
        overflow-y: auto;
    }

    .section-separator {
        border: none;
        border-top: 1px solid var(--border-color);
        margin: 1rem 0;
    }

    .emotes-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(50px, 1fr));
        gap: 0.125rem;
    }

    .copypastas-list {
        display: flex;
        flex-direction: column;
        gap: 0.125rem;
    }

    .chat-container {
        background: var(--bg-secondary);
        border-top: 1px solid var(--border-color);
        display: flex;
        flex-direction: column;
        height: 300px;
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
        padding: 0.5rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    /* Desktop layout - sidebar */
    @media (min-width: 1024px) {
        .main-container {
            flex-direction: row;
        }

        .favorites-content {
            flex: 1;
            border-right: 1px solid var(--border-color);
        }

        .chat-container {
            width: 400px;
            height: auto;
            border-top: none;
            border-left: 1px solid var(--border-color);
        }
    }

    @media (max-width: 600px) {
        .emotes-grid {
            grid-template-columns: repeat(auto-fill, minmax(45px, 1fr));
            gap: 0.0625rem;
        }

        .chat-container {
            height: 250px;
        }
    }
</style>

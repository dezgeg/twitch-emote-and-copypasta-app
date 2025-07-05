<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { browser } from "$app/environment";
    import { currentAccessToken, getFavoriteCopypastasStore } from "$lib/stores";
    import { persisted } from "svelte-persisted-store";
    import { ChatWebSocket, type ChatWebSocketState } from "$lib/chat-websocket";
    import { sendChatMessage, getUser, type ChatMessage } from "$lib/twitch-api";
    import type { Emote } from "$lib/emote-api";
    import ChatMessageCard from "./ChatMessageCard.svelte";
    import Spinner from "./Spinner.svelte";
    import { enableDragDropTouch } from "drag-drop-touch";

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

    // Message input state
    let messageInput = $state("");
    let sendingMessage = $state(false);
    let messageError = $state("");
    let currentUser = $state<{ id: string; login: string } | null>(null);
    let broadcasterUser = $state<{ id: string; login: string } | null>(null);

    let favoriteCopypastasStore = $derived(getFavoriteCopypastasStore(channel));

    // Detect if running in iframe
    let isInIframe = $derived(browser && window.self !== window.top);

    // Resizable chat height for mobile
    let chatHeightStore = persisted("chat-height", 300);
    let startY = $state(0);
    let startHeight = $state(0);

    onMount(() => {
        // Enable drag-drop-touch for mobile support
        enableDragDropTouch();
        initializeChat();
    });

    onDestroy(async () => {
        if (chatWS) {
            await chatWS.close();
        }
    });

    // Chat functions
    async function initializeChat() {
        if (!$currentAccessToken) {
            chatError = "No access token configured";
            chatLoading = false;
            return;
        }

        try {
            // Get current user info
            currentUser = await getUser($currentAccessToken);

            // Get broadcaster user info
            broadcasterUser = await getUser($currentAccessToken, channel);

            // Create WebSocket connection with access token and channel
            chatWS = new ChatWebSocket($currentAccessToken, channel);

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

    // Resize handlers for mobile using drag events
    function handleDragStart(e: DragEvent) {
        startY = e.clientY;
        startHeight = $chatHeightStore;

        // Create a transparent drag image
        const dragImage = document.createElement("div");
        dragImage.style.opacity = "0";
        document.body.appendChild(dragImage);
        e.dataTransfer?.setDragImage(dragImage, 0, 0);

        // Clean up drag image after a short delay
        setTimeout(() => document.body.removeChild(dragImage), 0);
    }

    function handleDrag(e: DragEvent) {
        // e.clientY can be 0 during drag, so we need to handle that
        if (e.clientY === 0) return;

        const deltaY = startY - e.clientY; // Inverted because we want dragging up to increase height
        const newHeight = Math.max(150, Math.min(600, startHeight + deltaY));

        $chatHeightStore = newHeight;
    }

    // Message sending functions
    async function sendMessage() {
        if (
            !messageInput.trim() ||
            sendingMessage ||
            !$currentAccessToken ||
            !currentUser ||
            !broadcasterUser
        ) {
            return;
        }

        const message = messageInput.trim();
        messageInput = "";
        sendingMessage = true;
        messageError = "";

        try {
            await sendChatMessage($currentAccessToken, broadcasterUser.id, currentUser.id, message);
        } catch (err) {
            console.error("Error sending message:", err);
            messageError = err instanceof Error ? err.message : "Failed to send message";
            messageInput = message; // Restore the message
        } finally {
            sendingMessage = false;
        }
    }

    function handleKeyPress(event: KeyboardEvent) {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    }

    function clearMessageError() {
        messageError = "";
    }
</script>

<div class="chat-container" class:iframe={isInIframe} style="height: {$chatHeightStore}px;">
    <!-- Resize handle for mobile -->
    <div
        class="resize-handle"
        draggable="true"
        ondragstart={handleDragStart}
        ondrag={handleDrag}
        role="slider"
        aria-label="Resize chat height"
        tabindex="0"
    >
        <div class="resize-grip"></div>
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

        <!-- Message input -->
        {#if chatState.connected && currentUser && broadcasterUser}
            <div class="message-input-container">
                {#if messageError}
                    <button
                        type="button"
                        class="message-error"
                        onclick={clearMessageError}
                        aria-label="Dismiss error message"
                    >
                        {messageError}
                    </button>
                {/if}
                <div class="message-input-wrapper">
                    <input
                        type="text"
                        bind:value={messageInput}
                        onkeypress={handleKeyPress}
                        oninput={clearMessageError}
                        placeholder="Type a message..."
                        disabled={sendingMessage}
                        class="message-input"
                        maxlength="500"
                    />
                    <button
                        onclick={sendMessage}
                        disabled={!messageInput.trim() || sendingMessage}
                        class="send-button"
                        aria-label="Send message"
                    >
                        {#if sendingMessage}
                            <div class="send-spinner"></div>
                        {:else}
                            Send
                        {/if}
                    </button>
                </div>
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
        /* height is now controlled by inline style */
        overflow: hidden;
        width: 100%;
        position: relative;
    }

    .resize-handle {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 20px;
        cursor: ns-resize;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--bg-primary);
        border-bottom: 1px solid var(--border-color);
        z-index: 10;
        touch-action: none;
        user-select: none;
    }

    .resize-handle:hover,
    .resize-handle:active {
        background: var(--accent-primary);
    }

    .resize-grip {
        width: 30px;
        height: 3px;
        background: var(--border-color);
        border-radius: 2px;
        transition: background-color 0.2s ease;
    }

    .resize-handle:hover .resize-grip,
    .resize-handle:active .resize-grip {
        background: white;
    }

    .chat-loading {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-top: 20px; /* Account for resize handle */
    }

    .chat-error {
        padding: 1rem;
        text-align: center;
        color: var(--text-primary);
        margin-top: 20px; /* Account for resize handle */
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
        margin-top: 20px; /* Account for resize handle */
    }

    .no-messages p {
        margin: 0;
    }

    .chat-messages {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 0.25rem 0;
        padding-top: calc(0.25rem + 20px); /* Account for resize handle */
        display: flex;
        flex-direction: column;
        gap: 0;
        width: 100%;
        box-sizing: border-box;
    }

    .message-input-container {
        border-top: 1px solid var(--border-color);
        padding: 0.5rem;
        background: var(--bg-primary);
    }

    .message-error {
        background: rgba(255, 87, 87, 0.1);
        color: #ff5757;
        padding: 0.5rem;
        border-radius: 4px;
        font-size: 0.875rem;
        margin-bottom: 0.5rem;
        cursor: pointer;
        border: 1px solid rgba(255, 87, 87, 0.3);
        width: 100%;
        text-align: left;
        font-family: inherit;
    }

    .message-error:hover {
        background: rgba(255, 87, 87, 0.15);
    }

    .message-input-wrapper {
        display: flex;
        gap: 0.5rem;
        align-items: flex-end;
    }

    .message-input {
        flex: 1;
        padding: 0.75rem;
        border: 1px solid var(--border-color);
        border-radius: 6px;
        background: var(--bg-secondary);
        color: var(--text-primary);
        font-size: 0.875rem;
        line-height: 1.4;
        resize: none;
        min-height: 20px;
        max-height: 100px;
    }

    .message-input:focus {
        outline: none;
        border-color: var(--accent-primary);
        box-shadow: 0 0 0 2px rgba(145, 70, 255, 0.2);
    }

    .message-input:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .send-button {
        padding: 0.75rem 1rem;
        background: var(--accent-primary);
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.875rem;
        font-weight: 500;
        min-width: 60px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.2s ease;
    }

    .send-button:hover:not(:disabled) {
        background: var(--accent-hover);
    }

    .send-button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        background: var(--accent-primary);
    }

    .send-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top: 2px solid white;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        0% {
            transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
        }
    }

    /* Desktop layout - sidebar */
    @media (min-width: 1024px) {
        .chat-container:not(.iframe) {
            width: 400px;
            height: auto;
            border-top: none;
            border-left: 1px solid var(--border-color);
        }

        .chat-container:not(.iframe) .resize-handle {
            display: none; /* Hide resize handle on desktop sidebar */
        }

        .chat-container:not(.iframe) .chat-messages {
            padding-top: 0.25rem; /* Reset padding for desktop */
        }

        .chat-container:not(.iframe) .chat-loading,
        .chat-container:not(.iframe) .chat-error,
        .chat-container:not(.iframe) .no-messages {
            margin-top: 0; /* Reset margin for desktop */
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

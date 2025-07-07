<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { browser } from "$app/environment";
    import {
        currentAccessToken,
        getFavoriteCopypastasStore,
        getFavoriteEmotesStore,
    } from "$lib/stores";
    import { persisted } from "svelte-persisted-store";
    import { ChatWebSocket, type ChatWebSocketState } from "$lib/chat-websocket";
    import { getUser, type ChatMessage as TwitchChatMessage } from "$lib/twitch-api";
    import { sendChatMessageWithDuplicateHandling } from "$lib/chat-utils";
    import type { Emote, EmoteDataStore } from "$lib/emote-api";
    import Spinner from "./Spinner.svelte";
    import ParsedMessage from "./ParsedMessage.svelte";
    import Button from "./Button.svelte";
    import { enableDragDropTouch } from "drag-drop-touch";
    import { isInIframe, toggleInArray } from "$lib/utils";

    interface Props {
        channel: string;
        allEmotesStore: EmoteDataStore;
    }

    let { channel, allEmotesStore }: Props = $props();

    // Chat state
    let chatLoading = $state(true);
    let chatError = $state("");
    let chatWS: ChatWebSocket | null = null;
    let messagesContainer = $state<HTMLDivElement>();
    let messages = $state<TwitchChatMessage[]>([]);
    let chatState = $state<ChatWebSocketState>({
        connected: false,
        error: null,
        sessionId: null,
    });
    let isAtBottom = $state(true);

    // Message input state
    let messageInput = $state("");
    let sendingMessage = $state(false);
    let currentUser = $state<{ id: string; login: string } | null>(null);
    let broadcasterUser = $state<{ id: string; login: string } | null>(null);
    let lastSentMessage = $state<string>("");

    let favoriteCopypastasStore = $derived(getFavoriteCopypastasStore(channel));
    let favoriteEmotesStore = $derived(getFavoriteEmotesStore(channel));

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
                messages = [...messages.slice(-499), message]; // Keep last 500 messages
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

    function toggleCopypasta(message: TwitchChatMessage) {
        if (isSingleEmote(message.message)) {
            // Handle as emote toggle
            const emoteName = message.message.trim();
            $favoriteEmotesStore = toggleInArray($favoriteEmotesStore, emoteName);
        } else {
            // Handle as copypasta toggle
            $favoriteCopypastasStore = toggleInArray($favoriteCopypastasStore, message.message);
        }
    }

    function isCopypastaFavorited(messageText: string): boolean {
        if (isSingleEmote(messageText)) {
            // Check if emote is favorited
            return $favoriteEmotesStore.includes(messageText.trim());
        } else {
            // Check if copypasta is favorited
            return $favoriteCopypastasStore.includes(messageText);
        }
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

        try {
            await sendChatMessageWithDuplicateHandling(
                $currentAccessToken,
                broadcasterUser.id,
                currentUser.id,
                message,
            );

            // Track successfully sent message for potential copypasta saving
            lastSentMessage = message;
        } catch (err) {
            // Error notification is shown by the utility, just restore the message
            messageInput = message;
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

    function isSingleEmote(messageText: string): boolean {
        const trimmed = messageText.trim();

        // Check if the message contains only one word and that word is an available emote
        const words = trimmed.split(/\s+/);
        if (words.length === 1) {
            return words[0] in $allEmotesStore;
        }

        return false;
    }

    function saveCopypasta() {
        const messageToSave = messageInput.trim() || lastSentMessage.trim();

        if (!messageToSave) return;

        if (isSingleEmote(messageToSave)) {
            // Save as favorite emote instead
            const emoteName = messageToSave.trim();
            const existingIndex = $favoriteEmotesStore.findIndex((emote) => emote === emoteName);

            if (existingIndex === -1) {
                favoriteEmotesStore.update((emotes) => [...emotes, emoteName]);
            }
        } else {
            // Save as copypasta
            const existingIndex = $favoriteCopypastasStore.findIndex((cp) => cp === messageToSave);

            if (existingIndex === -1) {
                favoriteCopypastasStore.update((copypastas) => [...copypastas, messageToSave]);
            }
        }

        // Clear message input if we saved from text box
        if (messageInput.trim()) {
            messageInput = "";
        }
    }
</script>

<div
    class="chat-container"
    class:iframe={isInIframe()}
    style:height={isInIframe() || (browser && window.innerWidth < 1024)
        ? `${$chatHeightStore}px`
        : null}
>
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

        <div class="chat-messages" bind:this={messagesContainer} onscroll={handleScroll}>
            {#each messages as chatMessage (chatMessage.id)}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div
                    class="chat-message"
                    class:favorited={isCopypastaFavorited(chatMessage.message)}
                    onclick={() => toggleCopypasta(chatMessage)}
                >
                    <span class="username" style="color: {chatMessage.color || '#9146ff'}"
                        >{chatMessage.user_name}:</span
                    >
                    <span class="message-content">
                        <ParsedMessage
                            message={chatMessage.message}
                            {allEmotesStore}
                            emoteClass="chat-emote"
                        />
                    </span>
                </div>
            {/each}
        </div>

        <!-- Message input -->
        {#if chatState.connected && currentUser && broadcasterUser}
            <div class="message-input-container">
                <div class="message-input-wrapper">
                    <input
                        type="text"
                        bind:value={messageInput}
                        onkeypress={handleKeyPress}
                        placeholder="Type a message..."
                        disabled={sendingMessage}
                        class="message-input"
                        maxlength="500"
                    />
                    <Button
                        variant="icon"
                        onclick={saveCopypasta}
                        disabled={!messageInput.trim() && !lastSentMessage.trim()}
                        aria-label={messageInput.trim()
                            ? "Save current text as copypasta"
                            : "Save last sent message as copypasta"}
                        title={messageInput.trim()
                            ? "Save current text as copypasta"
                            : "Save last sent message as copypasta"}
                    >
                        💾
                    </Button>
                    <Button
                        variant="icon"
                        onclick={sendMessage}
                        disabled={!messageInput.trim() || sendingMessage}
                        aria-label="Send message"
                    >
                        {#if sendingMessage}
                            <div class="send-spinner-wrapper">
                                <Spinner />
                            </div>
                        {:else}
                            📤
                        {/if}
                    </Button>
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

    /* Mobile-like scrollbar */
    .chat-messages::-webkit-scrollbar {
        width: 4px;
    }

    .chat-messages::-webkit-scrollbar-track {
        background: transparent;
    }

    .chat-messages::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.3);
        border-radius: 2px;
    }

    .chat-messages::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.5);
    }

    /* Firefox scrollbar */
    .chat-messages {
        scrollbar-width: thin;
        scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
    }

    /* Inline chat message styling */
    .chat-message {
        padding: 0.25rem 0.5rem;
        flex-shrink: 0;
        width: 100%;
        box-sizing: border-box;
        overflow: hidden;
        line-height: 1.4;
        font-size: 0.875rem;
        cursor: pointer;
        transition: background-color 0.1s ease;
        border-radius: 0;
        border: none;
        background: transparent;
    }

    .chat-message:hover {
        background: rgba(255, 255, 255, 0.05);
    }

    .chat-message.favorited {
        background: rgba(145, 70, 255, 0.1);
        border-left: 3px solid var(--accent-primary);
        padding-left: calc(0.5rem - 3px);
    }

    .chat-message.favorited:hover {
        background: rgba(145, 70, 255, 0.15);
    }

    .username {
        font-weight: bold;
        font-size: 0.875rem;
        margin-right: 0.25rem;
    }

    .message-content {
        color: var(--text-primary);
        word-wrap: break-word;
        overflow-wrap: break-word;
    }

    .message-input-container {
        border-top: 1px solid var(--border-color);
        padding: 0.5rem;
        background: var(--bg-primary);
    }

    .message-input-wrapper {
        display: flex;
        gap: 0.5rem;
        align-items: flex-end;
    }

    .message-input {
        flex: 1;
        padding: 0.5rem 0.75rem;
        border: 1px solid var(--border-color);
        border-radius: 6px;
        background: var(--bg-secondary);
        color: var(--text-primary);
        font-size: 0.875rem;
        line-height: 1.4;
        resize: none;
        height: 36px;
        box-sizing: border-box;
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

    .send-spinner-wrapper :global(.spinner) {
        width: 16px;
        height: 16px;
        border-width: 2px;
        margin: 0;
    }

    /* Desktop layout - sidebar */
    @media (min-width: 1024px) {
        .chat-container:not(.iframe) {
            width: 400px;
            height: 100%;
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
        .chat-container:not(.iframe) .chat-error {
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

        .chat-message {
            padding: 0.25rem 0.5rem;
            font-size: 0.8rem;
        }

        .username {
            font-size: 0.8rem;
        }
    }
</style>

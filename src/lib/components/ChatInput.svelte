<script lang="ts">
    import type { Emote, EmoteDataStore } from "$lib/emote-api";
    import Button from "./Button.svelte";
    import Spinner from "./Spinner.svelte";
    import { sendChatMessageWithDuplicateHandling, cleanMessage } from "$lib/chat-utils";
    import { requireAuth } from "$lib/auth-guard";
    import { getFavoriteEmotesStore, getFavoriteCopypastasStore } from "$lib/stores";

    interface Props {
        // Channel for store lookups
        channel: string;

        // Emotes for autocomplete
        allEmotesStore: EmoteDataStore;

        // User info for sending messages
        currentUser: { id: string } | null;
        broadcasterUser: { id: string } | null;

        // Input state
        disabled?: boolean;
    }

    let {
        channel,
        allEmotesStore,
        currentUser,
        broadcasterUser,
        disabled = false,
    }: Props = $props();

    // Internal state
    let messageInput = $state("");
    let sendingMessage = $state(false);
    let lastSentMessage = $state("");

    // Channel-specific stores
    let favoriteEmotesStore = $derived(getFavoriteEmotesStore(channel));
    let favoriteCopypastasStore = $derived(getFavoriteCopypastasStore(channel));

    // Input element and autocomplete state
    let inputElement = $state<HTMLInputElement>();
    let autocompleteVisible = $state(false);
    let autocompleteQuery = $state("");
    let autocompleteSelectedIndex = $state(0);
    let autocompleteStartIndex = $state(0);

    // Filter emotes based on query
    let filteredEmotes = $derived.by(() => {
        if (autocompleteQuery.length < 2) {
            return [];
        }

        const lowerQuery = autocompleteQuery.toLowerCase();
        const emotes = Object.values($allEmotesStore) as Emote[];

        return emotes
            .filter((emote) => emote.name.toLowerCase().startsWith(lowerQuery))
            .slice(0, 25) // Limit to 25 results
            .sort((a, b) => {
                // Sort by length (shorter names first)
                return a.name.length - b.name.length;
            });
    });

    function updateAutocomplete() {
        if (!inputElement) return;

        const input = inputElement;
        const cursorPos = input.selectionStart ?? 0;
        const text = messageInput;

        // Find the last : before or at cursor position
        let colonIndex = -1;
        for (let i = cursorPos - 1; i >= 0; i--) {
            if (text[i] === ":") {
                colonIndex = i;
                break;
            } else if (text[i] === " ") {
                // Stop if we hit a space (word boundary)
                break;
            }
        }

        // Check if we found a : and have at least 2 characters after it
        if (colonIndex >= 0) {
            const afterColon = text.slice(colonIndex + 1, cursorPos);

            // Only show autocomplete if we're at the end of the word and have 2+ chars
            const isAtWordEnd = cursorPos === text.length || text[cursorPos] === " ";

            if (afterColon.length >= 2 && isAtWordEnd && !/\s/.test(afterColon)) {
                autocompleteQuery = afterColon;
                autocompleteStartIndex = colonIndex;
                autocompleteSelectedIndex = 0;
                autocompleteVisible = true;
                return;
            }
        }

        autocompleteVisible = false;
    }

    function completeEmote(emote: Emote) {
        if (!inputElement) return;

        // Replace from the : to the current cursor position with the emote name
        const beforeColon = messageInput.slice(0, autocompleteStartIndex);
        const afterCursor = messageInput.slice(inputElement.selectionStart ?? 0);

        const newValue = beforeColon + emote.name + afterCursor;
        messageInput = newValue;

        // Set cursor position after the emote name
        setTimeout(() => {
            if (inputElement) {
                const newCursorPos = beforeColon.length + emote.name.length;
                inputElement.setSelectionRange(newCursorPos, newCursorPos);
                inputElement.focus();
            }
        }, 0);

        autocompleteVisible = false;
    }

    function handleInput(event: Event) {
        const target = event.target as HTMLInputElement;
        messageInput = target.value;
        updateAutocomplete();
    }

    // Message sending functions
    async function sendMessage() {
        if (
            !messageInput.trim() ||
            sendingMessage ||
            !currentUser ||
            !broadcasterUser ||
            disabled
        ) {
            return;
        }

        const message = messageInput.trim();
        messageInput = "";
        sendingMessage = true;

        try {
            const token = await requireAuth();
            await sendChatMessageWithDuplicateHandling(
                token,
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

    function saveCopypasta() {
        const messageToSave = messageInput.trim() || lastSentMessage.trim();

        if (!messageToSave) return;

        const cleanedMessage = cleanMessage(messageToSave);

        if (cleanedMessage in $allEmotesStore) {
            // Save as favorite emote instead
            if (!$favoriteEmotesStore.includes(cleanedMessage)) {
                $favoriteEmotesStore = [...$favoriteEmotesStore, cleanedMessage];
            }
        } else {
            // Save as copypasta
            if (!$favoriteCopypastasStore.includes(cleanedMessage)) {
                $favoriteCopypastasStore = [...$favoriteCopypastasStore, cleanedMessage];
            }
        }

        // Clear message input if we saved from text box
        if (messageInput.trim()) {
            messageInput = "";
        }
    }

    function handleKeyDown(event: KeyboardEvent) {
        if (!autocompleteVisible) return;

        if (event.key === "ArrowDown") {
            event.preventDefault();
            autocompleteSelectedIndex = Math.min(
                autocompleteSelectedIndex + 1,
                filteredEmotes.length - 1,
            );
            scrollSelectedIntoView();
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            autocompleteSelectedIndex = Math.max(autocompleteSelectedIndex - 1, 0);
            scrollSelectedIntoView();
        } else if (event.key === "Tab" || event.key === "Enter") {
            if (filteredEmotes[autocompleteSelectedIndex]) {
                event.preventDefault();
                completeEmote(filteredEmotes[autocompleteSelectedIndex]);
            }
        } else if (event.key === "Escape") {
            event.preventDefault();
            autocompleteVisible = false;
        }
    }

    function scrollSelectedIntoView() {
        setTimeout(() => {
            const dropdown = document.querySelector(".autocomplete-dropdown");
            const selectedItem = dropdown?.querySelector(".autocomplete-item.selected");
            if (selectedItem) {
                selectedItem.scrollIntoView({
                    block: "nearest",
                    behavior: "smooth",
                });
            }
        }, 0);
    }

    function handleKeyPress(event: KeyboardEvent) {
        if (event.key === "Enter" && !event.shiftKey && !autocompleteVisible) {
            event.preventDefault();
            sendMessage();
        }
    }

    function handleEmoteClick(emote: Emote, event: MouseEvent) {
        event.preventDefault();
        completeEmote(emote);
    }
</script>

<div class="chat-input-container">
    <div class="message-input-wrapper">
        <input
            bind:this={inputElement}
            bind:value={messageInput}
            type="text"
            oninput={handleInput}
            onkeydown={handleKeyDown}
            onkeypress={handleKeyPress}
            placeholder="Type a message... (use :emoteName for autocomplete)"
            disabled={disabled || sendingMessage || !currentUser || !broadcasterUser}
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
            disabled={!messageInput.trim() ||
                sendingMessage ||
                disabled ||
                !currentUser ||
                !broadcasterUser}
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

    <!-- Emote autocomplete dropdown -->
    {#if autocompleteVisible && filteredEmotes.length > 0}
        <div class="autocomplete-dropdown">
            {#each filteredEmotes as emote, index}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <div
                    class="autocomplete-item"
                    class:selected={index === autocompleteSelectedIndex}
                    onclick={(event) => handleEmoteClick(emote, event)}
                    onmouseenter={() => {}}
                    role="option"
                    aria-selected={index === autocompleteSelectedIndex}
                    tabindex="-1"
                >
                    <img src={emote.url} alt={emote.name} class="autocomplete-emote" />
                    <span class="autocomplete-name">{emote.name}</span>
                    <span class="autocomplete-type">{emote.type.toUpperCase()}</span>
                </div>
            {/each}
        </div>
    {/if}
</div>

<style>
    .chat-input-container {
        position: relative;
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

    /* Autocomplete dropdown */
    .autocomplete-dropdown {
        position: absolute;
        bottom: 100%;
        left: 0;
        right: 0;
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 1000;
        max-height: 300px;
        overflow-y: auto;
        margin-bottom: 4px;
    }

    .autocomplete-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem;
        cursor: pointer;
        border-bottom: 1px solid var(--border-color);
    }

    .autocomplete-item:last-child {
        border-bottom: none;
    }

    .autocomplete-item:hover,
    .autocomplete-item.selected {
        background: var(--bg-tertiary);
    }

    .autocomplete-emote {
        width: 20px;
        height: 20px;
        flex-shrink: 0;
    }

    .autocomplete-name {
        flex: 1;
        font-weight: 500;
        color: var(--text-primary);
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .autocomplete-type {
        font-size: 0.7rem;
        color: var(--text-secondary);
        padding: 0.1rem 0.3rem;
        border-radius: 4px;
        background: var(--bg-primary);
        flex-shrink: 0;
    }

    /* Mobile scrollbar */
    .autocomplete-dropdown::-webkit-scrollbar {
        width: 4px;
    }

    .autocomplete-dropdown::-webkit-scrollbar-track {
        background: transparent;
    }

    .autocomplete-dropdown::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.3);
        border-radius: 2px;
    }
</style>

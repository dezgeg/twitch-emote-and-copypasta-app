<script lang="ts">
    import type { Emote } from "$lib/emote-api";

    interface Props {
        // Core message data
        message: string;
        timestamp?: string;
        user_name?: string;
        color?: string;

        // Display settings
        emotes?: Emote[];
        isFavorited?: boolean;

        // Event handlers
        onClick?: (message: string) => void;
    }

    let {
        message,
        timestamp,
        user_name,
        color,
        emotes = [],
        isFavorited = false,
        onClick,
    }: Props = $props();

    function parseMessageWithEmotes(messageText: string): (string | Emote)[] {
        if (!emotes.length) {
            return [messageText];
        }

        // Normalize whitespace to single spaces
        const normalizedText = messageText.replace(/\s+/g, " ").trim();

        // Create a map for faster emote lookup
        const emoteMap = new Map(emotes.map((emote) => [emote.name, emote]));

        // Split by spaces, preserving the spaces as separate elements
        const parts = normalizedText.split(/( )/);

        return parts.map((part) => {
            if (emoteMap.has(part)) {
                return emoteMap.get(part)!;
            }
            return part;
        });
    }

    function formatTimestamp(timestamp: string): string {
        return new Date(timestamp).toLocaleTimeString();
    }

    function handleClick() {
        if (onClick) {
            onClick(message);
        }
    }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    class="chat-message"
    class:chat-message--favorited={isFavorited}
    class:chat-message--clickable={!!onClick}
    onclick={onClick ? handleClick : undefined}
>
    <div class="message-header">
        {#if user_name}
            <span class="username" style="color: {color || '#9146ff'}">
                {user_name}
            </span>
        {/if}
        <div class="message-actions">
            {#if timestamp}
                <span class="timestamp">{formatTimestamp(timestamp)}</span>
            {/if}
        </div>
    </div>
    <div class="message-content">
        {#each parseMessageWithEmotes(message) as part}
            {#if typeof part === "string"}
                {part}
            {:else}
                <img src={part.url} alt={part.name} class="chat-emote" title={part.name} />
            {/if}
        {/each}
    </div>
</div>

<style>
    .chat-message {
        padding: 0.75rem;
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        transition: background-color 0.2s ease;
        flex-shrink: 0;
    }

    .chat-message--clickable {
        cursor: pointer;
    }

    .chat-message--clickable:hover {
        background: var(--bg-tertiary);
    }

    .chat-message--favorited {
        background: rgba(145, 70, 255, 0.15);
        border-color: var(--accent-primary);
    }

    .chat-message--favorited:hover {
        background: rgba(145, 70, 255, 0.25);
        border-color: var(--accent-hover);
    }

    .message-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
    }

    .message-actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
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

    .chat-emote {
        height: 1.5rem;
        width: auto;
        vertical-align: middle;
        margin: 0 0.1rem;
        border-radius: 2px;
    }

    @media (max-width: 600px) {
        .chat-message {
            padding: 0.5rem;
        }

        .message-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.25rem;
        }
    }
</style>

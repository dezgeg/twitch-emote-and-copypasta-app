<script lang="ts">
    import type { Emote } from "$lib/emote-api";
    import "$lib/styles/card.css";

    interface Props {
        // Core message data
        message: string;
        timestamp?: string;
        user_name?: string;
        color?: string;

        // Display settings
        emotes?: Map<string, Emote>;
        isFavorited?: boolean;

        // Event handlers
        onClick?: (message: string) => void;
    }

    let {
        message,
        timestamp,
        user_name,
        color,
        emotes = new Map(),
        isFavorited = false,
        onClick,
    }: Props = $props();

    function parseMessageWithEmotes(messageText: string): (string | Emote)[] {
        if (!emotes.size) {
            return [messageText];
        }

        // Normalize whitespace to single spaces
        const normalizedText = messageText.replace(/\s+/g, " ").trim();

        // Split by spaces, preserving the spaces as separate elements
        const parts = normalizedText.split(/( )/);

        return parts.map((part) => {
            if (emotes.has(part)) {
                return emotes.get(part)!;
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
    class="card chat-message"
    class:card--favorited={isFavorited}
    class:card--clickable={!!onClick}
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
        flex-shrink: 0;
        width: 100%;
        box-sizing: border-box;
        overflow: hidden;
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
        overflow-wrap: break-word;
        max-width: 100%;
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

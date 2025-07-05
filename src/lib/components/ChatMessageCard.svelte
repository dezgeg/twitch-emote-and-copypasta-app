<script lang="ts">
    import type { Emote } from "$lib/emote-api";
    import { parseMessageWithEmotes } from "$lib/emote-api";
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
    {#if user_name}
        <div class="username" style="color: {color || '#9146ff'}">
            {user_name}
        </div>
    {/if}
    <div class="message-content">
        {#each parseMessageWithEmotes(message, emotes) as part}
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
        padding: 0.5rem;
        flex-shrink: 0;
        width: 100%;
        box-sizing: border-box;
        overflow: hidden;
    }

    .username {
        font-weight: bold;
        font-size: 0.8rem;
        margin-bottom: 0.25rem;
    }

    .message-content {
        color: var(--text-primary);
        line-height: 1.3;
        font-size: 0.85rem;
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
    }
</style>

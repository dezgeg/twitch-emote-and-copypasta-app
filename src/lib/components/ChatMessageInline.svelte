<script lang="ts">
    import type { Emote } from "$lib/emote-api";
    import { parseMessageWithEmotes } from "$lib/emote-api";

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
    class="chat-message"
    class:favorited={isFavorited}
    class:clickable={!!onClick}
    onclick={onClick ? handleClick : undefined}
>
    {#if user_name}
        <span class="username" style="color: {color || '#9146ff'}">{user_name}:</span>
    {/if}
    <span class="message-content">
        {#each parseMessageWithEmotes(message, emotes) as part}
            {#if typeof part === "string"}
                {part}
            {:else}
                <img src={part.url} alt={part.name} class="chat-emote" title={part.name} />
            {/if}
        {/each}
    </span>
</div>

<style>
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

    .chat-message.clickable {
        cursor: pointer;
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

    .chat-emote {
        height: 1.2rem;
        width: auto;
        vertical-align: middle;
        margin: 0 0.1rem;
        border-radius: 2px;
    }

    @media (max-width: 600px) {
        .chat-message {
            padding: 0.25rem 0.5rem;
            font-size: 0.8rem;
        }

        .username {
            font-size: 0.8rem;
        }

        .chat-emote {
            height: 1rem;
        }
    }
</style>

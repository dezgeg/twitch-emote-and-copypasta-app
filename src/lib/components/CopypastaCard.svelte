<script lang="ts">
    import type { Emote } from "$lib/emote-api";
    import { parseMessageWithEmotes } from "$lib/emote-api";
    import type { Writable } from "svelte/store";
    import "$lib/styles/card.css";

    interface Props {
        // Core message data
        message: string;

        // Display settings
        allEmotesStore?: Writable<Record<string, Emote>> | null;
        isFavorited?: boolean;

        // Event handlers
        onClick?: (message: string) => void;
    }

    let { message, allEmotesStore = null, isFavorited = false, onClick }: Props = $props();
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    class="card copypasta-card"
    class:card--favorited={isFavorited}
    class:card--clickable={!!onClick}
    onclick={onClick ? () => onClick(message) : undefined}
>
    <div class="message-content">
        {#each parseMessageWithEmotes(message, allEmotesStore) as part}
            {#if typeof part === "string"}
                {part}
            {:else}
                <img src={part.url} alt={part.name} class="copypasta-emote" title={part.name} />
            {/if}
        {/each}
    </div>
</div>

<style>
    .copypasta-card {
        padding: 0.5rem;
        flex-shrink: 0;
        width: 100%;
        box-sizing: border-box;
        overflow: hidden;
    }

    .message-content {
        color: var(--text-primary);
        line-height: 1.3;
        font-size: 0.85rem;
        word-wrap: break-word;
        overflow-wrap: break-word;
        max-width: 100%;
    }

    .copypasta-emote {
        height: 1.5rem;
        width: auto;
        vertical-align: middle;
        margin: 0 0.1rem;
        border-radius: 2px;
    }

    @media (max-width: 600px) {
        .copypasta-card {
            padding: 0.5rem;
        }
    }
</style>

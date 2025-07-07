<script lang="ts">
    import type { EmoteDataStore } from "$lib/emote-api";
    import "$lib/styles/card.css";
    import ParsedMessage from "./ParsedMessage.svelte";

    interface Props {
        // Core message data
        message: string;

        // Display settings
        allEmotesStore: EmoteDataStore;
        isFavorited?: boolean;

        // Event handlers
        onClick?: (message: string) => void;
    }

    let { message, allEmotesStore, isFavorited = false, onClick }: Props = $props();
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
        <ParsedMessage {message} {allEmotesStore} emoteClass="copypasta-emote" />
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
</style>

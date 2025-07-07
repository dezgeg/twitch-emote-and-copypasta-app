<script lang="ts">
    import { parseMessageWithEmotes, type EmoteDataStore } from "$lib/emote-api";

    interface Props {
        message: string;
        allEmotesStore: EmoteDataStore;
        emoteClass?: string;
    }

    let { message, allEmotesStore, emoteClass = "parsed-message-emote" }: Props = $props();

    let parsedParts = $derived(parseMessageWithEmotes(message, $allEmotesStore));
</script>

{#each parsedParts as part}
    {#if typeof part === "string"}
        {part}
    {:else}
        <img src={part.url} alt={part.name} class={emoteClass} title={part.name} />
    {/if}
{/each}

<style>
    :global(.parsed-message-emote) {
        height: 1.2rem;
        width: auto;
        vertical-align: middle;
        margin: 0 0.1rem;
        border-radius: 2px;
    }

    :global(.chat-emote) {
        height: 1.2rem;
        width: auto;
        vertical-align: middle;
        margin: 0 0.1rem;
        border-radius: 2px;
    }

    :global(.copypasta-emote) {
        height: 1.5rem;
        width: auto;
        vertical-align: middle;
        margin: 0 0.1rem;
        border-radius: 2px;
    }

    @media (max-width: 600px) {
        :global(.parsed-message-emote) {
            height: 1rem;
        }

        :global(.chat-emote) {
            height: 1rem;
        }
    }
</style>

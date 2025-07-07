<script lang="ts">
    import type { Emote, EmoteDataStore } from "$lib/emote-api";

    interface Props {
        message: string;
        allEmotesStore: EmoteDataStore;
        emoteClass: string;
    }

    let { message, allEmotesStore, emoteClass }: Props = $props();

    /**
     * Parse message text and replace emote names with Emote objects
     */
    function parseMessageWithEmotes(
        messageText: string,
        emotesRecord: Record<string, Emote>,
    ): (string | Emote)[] {
        if (!Object.keys(emotesRecord).length) {
            return [messageText];
        }

        // Normalize whitespace to single spaces
        const normalizedText = messageText.replace(/\s+/g, " ").trim();

        // Split by spaces, preserving the spaces as separate elements
        const parts = normalizedText.split(/( )/);

        return parts.map((part) => {
            if (emotesRecord[part]) {
                return emotesRecord[part];
            }
            return part;
        });
    }

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
        :global(.chat-emote) {
            height: 1rem;
        }
    }
</style>

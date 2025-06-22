<script lang="ts">
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";
    import { loadAllEmotes, getEmoteOrPlaceholder, type Emote } from "$lib/emote-api";
    import { twitchApiKey, getFavoriteEmotesStore, getFavoriteCopypastasStore } from "$lib/stores";
    import Spinner from "$lib/components/Spinner.svelte";
    import EmoteCard from "$lib/components/EmoteCard.svelte";
    import ChatMessageCard from "$lib/components/ChatMessageCard.svelte";
    import DragAndDropList from "$lib/components/DragAndDropList.svelte";
    import { base } from "$app/paths";
    import "drag-drop-touch";

    let allEmotes: Map<string, Emote> = $state(new Map());
    let loading = $state(true);
    let error = $state("");

    let channel = $derived($page.params.channel);
    let favoriteEmotesStore = $derived(getFavoriteEmotesStore(channel));
    let favoriteCopypastasStore = $derived(getFavoriteCopypastasStore(channel));

    onMount(async () => {
        await loadFavoriteEmotes();
    });

    async function loadFavoriteEmotes() {
        try {
            if (!$twitchApiKey) {
                goto(`${base}/setup`);
                return;
            }

            // Always load emotes if we have favorites to display them properly
            if ($favoriteEmotesStore.length > 0) {
                allEmotes = await loadAllEmotes($twitchApiKey, channel);
            }
        } catch (err) {
            console.error("Error loading emotes:", err);
            error = err instanceof Error ? err.message : "Failed to load emotes";
        } finally {
            loading = false;
        }
    }

    function removeEmoteFromFavorites(emoteName: string, index: number) {
        $favoriteEmotesStore = $favoriteEmotesStore.filter((name) => name !== emoteName);
    }

    function removeCopypastaFromFavorites(copypasta: string, index: number) {
        $favoriteCopypastasStore = $favoriteCopypastasStore.filter((text) => text !== copypasta);
    }
</script>

<svelte:head>
    <title>Twitch Emote and Copypasta App - Edit {channel} Favorites</title>
</svelte:head>

{#if loading}
    <Spinner />
{:else if error}
    <div class="error">
        <p>Error: {error}</p>
    </div>
{:else}
    <div class="page-padding edit-container">
        <section class="emotes-section">
            <DragAndDropList
                bind:list={$favoriteEmotesStore}
                showTrash={true}
                onTrashDrop={removeEmoteFromFavorites}
            >
                {#snippet renderItem(emoteName: string)}
                    {@const emote = getEmoteOrPlaceholder(allEmotes, emoteName)}
                    <EmoteCard {emote} mode="edit" />
                {/snippet}
                {#snippet renderEmpty()}
                    <p>No favorite emotes yet.</p>
                {/snippet}
            </DragAndDropList>
        </section>

        <hr class="section-separator" />

        <section class="copypastas-section">
            <DragAndDropList
                bind:list={$favoriteCopypastasStore}
                showTrash={true}
                onTrashDrop={removeCopypastaFromFavorites}
                gridClass="copypasta-list"
            >
                {#snippet renderItem(copypasta: string)}
                    <ChatMessageCard message={copypasta} emotes={allEmotes} />
                {/snippet}
                {#snippet renderEmpty()}
                    <p>No favorite copypastas yet.</p>
                {/snippet}
            </DragAndDropList>
        </section>
    </div>
{/if}

<style>
    .section-separator {
        border: none;
        border-top: 1px solid var(--border-color);
        margin: 1rem 0;
    }

    :global(.copypasta-list) {
        display: flex;
        flex-direction: column;
        gap: 0.125rem;
        margin-bottom: 2rem;
    }
</style>

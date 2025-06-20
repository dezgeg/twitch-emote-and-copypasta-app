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
    <div class="edit-container">
        <section class="emotes-section">
            <h2>Favorite Emotes</h2>
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
                    <p>
                        No favorite emotes yet. <a
                            href="{base}/channel/{channel}/add"
                            class="button">Add some!</a
                        >
                    </p>
                {/snippet}
            </DragAndDropList>
        </section>

        <section class="copypastas-section">
            <h2>Favorite Copypastas</h2>
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
                    <p>
                        No favorite copypastas yet. <a
                            href="{base}/channel/{channel}/chat"
                            class="button">Add some from chat!</a
                        >
                    </p>
                {/snippet}
            </DragAndDropList>
        </section>
    </div>
{/if}

<style>
    .edit-container {
        margin: 1rem 0;
    }

    .emotes-section,
    .copypastas-section {
        margin-bottom: 2rem;
    }

    .emotes-section h2,
    .copypastas-section h2 {
        margin-bottom: 1rem;
        font-size: 1.25rem;
        font-weight: 600;
    }

    :global(.copypasta-list) {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-bottom: 2rem;
    }
</style>

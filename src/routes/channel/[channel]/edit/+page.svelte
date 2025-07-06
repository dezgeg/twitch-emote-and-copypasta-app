<script lang="ts">
    import { page } from "$app/stores";
    import { onMount } from "svelte";
    import {
        createEmoteDataStore,
        getEmoteOrPlaceholder,
        type Emote,
        type EmoteDataStore,
    } from "$lib/emote-api";
    import { getFavoriteEmotesStore, getFavoriteCopypastasStore } from "$lib/stores";
    import { requireAuth } from "$lib/auth-guard";
    import FetchStatus from "$lib/components/FetchStatus.svelte";
    import EmoteCard from "$lib/components/EmoteCard.svelte";
    import CopypastaCard from "$lib/components/CopypastaCard.svelte";
    import DragAndDropList from "$lib/components/DragAndDropList.svelte";
    import TrashDropZone from "$lib/components/TrashDropZone.svelte";

    let fetchStatus: any;
    let trashDropZone: TrashDropZone = $state()!;

    let channel = $derived($page.params.channel);
    let favoriteEmotesStore = $derived(getFavoriteEmotesStore(channel));
    let favoriteCopypastasStore = $derived(getFavoriteCopypastasStore(channel));

    // Initialize emote store directly
    let allEmotesStore = $derived(createEmoteDataStore(channel));

    onMount(async () => {
        fetchStatus.run(async () => {
            const token = await requireAuth();
            await allEmotesStore.lazyFetch(token);
        });
    });
</script>

<svelte:head>
    <title>Twitch Emote and Copypasta App - Edit {channel} Favorites</title>
</svelte:head>

<FetchStatus bind:this={fetchStatus} errorPrefix="Failed to load favorite emotes">
    <div class="page-padding edit-container">
        <section class="emotes-section">
            <DragAndDropList store={favoriteEmotesStore} {trashDropZone}>
                {#snippet renderItem(emoteName: string)}
                    {@const emote = getEmoteOrPlaceholder($allEmotesStore, emoteName)}
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
                store={favoriteCopypastasStore}
                {trashDropZone}
                gridClass="copypasta-list"
            >
                {#snippet renderItem(copypasta: string)}
                    <CopypastaCard message={copypasta} {allEmotesStore} />
                {/snippet}
                {#snippet renderEmpty()}
                    <p>No favorite copypastas yet.</p>
                {/snippet}
            </DragAndDropList>
        </section>
    </div>
</FetchStatus>

<TrashDropZone bind:this={trashDropZone} />

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

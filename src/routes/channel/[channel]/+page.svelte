<script lang="ts">
    import { page } from "$app/stores";
    import { onMount } from "svelte";
    import {
        createEmoteDataStore,
        getEmoteOrPlaceholder,
        type EmoteDataStore,
    } from "$lib/emote-api";
    import { getFavoriteEmotesStore, getFavoriteCopypastasStore } from "$lib/stores";
    import { getUser } from "$lib/twitch-api";
    import { requireAuth } from "$lib/auth-guard";
    import { sendChatMessageWithDuplicateHandling } from "$lib/chat-utils";
    import EmoteCard from "$lib/components/EmoteCard.svelte";
    import CopypastaCard from "$lib/components/CopypastaCard.svelte";
    import DragAndDropList from "$lib/components/DragAndDropList.svelte";
    import TrashDropZone from "$lib/components/TrashDropZone.svelte";

    let broadcasterId = $state("");
    let senderId = $state("");
    let trashDropZone: TrashDropZone = $state()!;

    let channel = $derived($page.params.channel);

    // Create our own store instance (will share cached data with layout)
    let allEmotesStore = $derived(createEmoteDataStore(channel));
    let favoriteEmotesStore = $derived(getFavoriteEmotesStore(channel));
    let favoriteCopypastasStore = $derived(getFavoriteCopypastasStore(channel));

    onMount(async () => {
        await loadUserIds();
    });

    async function loadUserIds() {
        const token = await requireAuth();

        // Get current user and broadcaster info once and cache them
        const [currentUser, broadcaster] = await Promise.all([
            getUser(token),
            getUser(token, channel),
        ]);

        senderId = currentUser.id;
        broadcasterId = broadcaster.id;
    }

    async function sendToChat(item: { name: string; url: string } | string) {
        const token = await requireAuth();

        if (!broadcasterId || !senderId) {
            throw new Error("User information not loaded yet");
        }

        const text = typeof item === "string" ? item : item.name;
        await sendChatMessageWithDuplicateHandling(token, broadcasterId, senderId, text);
    }
</script>

<svelte:head>
    <title>Twitch Emote and Copypasta App - {channel} Favorites</title>
</svelte:head>

<div class="page-padding">
    <section class="emotes-section">
        <DragAndDropList store={favoriteEmotesStore} {trashDropZone}>
            {#snippet renderItem(emoteName: string)}
                {@const emote = getEmoteOrPlaceholder($allEmotesStore, emoteName)}
                <EmoteCard {emote} mode="view" onClick={sendToChat} />
            {/snippet}
            {#snippet renderEmpty()}
                <p>No favorite emotes yet.</p>
            {/snippet}
        </DragAndDropList>
    </section>

    <hr class="section-separator" />

    <section class="copypastas-section">
        <DragAndDropList store={favoriteCopypastasStore} {trashDropZone} gridClass="copypasta-list">
            {#snippet renderItem(copypasta: string)}
                <CopypastaCard message={copypasta} {allEmotesStore} onClick={sendToChat} />
            {/snippet}
            {#snippet renderEmpty()}
                <p>No favorite copypastas yet.</p>
            {/snippet}
        </DragAndDropList>
    </section>
</div>

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

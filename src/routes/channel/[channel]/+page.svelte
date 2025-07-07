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

    let broadcasterId = $state("");
    let senderId = $state("");

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
        <div class="emotes-grid">
            {#each $favoriteEmotesStore as emoteName (emoteName)}
                {@const emote = getEmoteOrPlaceholder($allEmotesStore, emoteName)}
                <EmoteCard {emote} mode="view" onClick={sendToChat} />
            {:else}
                <p>No favorite emotes yet.</p>
            {/each}
        </div>
    </section>

    <hr class="section-separator" />

    <section class="copypastas-section">
        <div class="copypastas-list">
            {#each $favoriteCopypastasStore as copypasta (copypasta)}
                <CopypastaCard message={copypasta} {allEmotesStore} onClick={sendToChat} />
            {:else}
                <p>No favorite copypastas yet.</p>
            {/each}
        </div>
    </section>
</div>

<style>
    .section-separator {
        border: none;
        border-top: 1px solid var(--border-color);
        margin: 1rem 0;
    }

    .emotes-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(50px, 1fr));
        gap: 0.125rem;
    }

    .copypastas-list {
        display: flex;
        flex-direction: column;
        gap: 0.125rem;
    }

    @media (max-width: 600px) {
        .emotes-grid {
            grid-template-columns: repeat(auto-fill, minmax(45px, 1fr));
            gap: 0.0625rem;
        }
    }
</style>

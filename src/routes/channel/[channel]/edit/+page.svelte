<script lang="ts">
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";
    import { loadAllEmotes, getEmoteOrPlaceholder, type Emote } from "$lib/emote-api";
    import { twitchApiKey, getFavoriteEmotesStore, getFavoriteCopypastasStore } from "$lib/stores";
    import FetchStatus from "$lib/components/FetchStatus.svelte";
    import EmoteCard from "$lib/components/EmoteCard.svelte";
    import ChatMessageCard from "$lib/components/ChatMessageCard.svelte";
    import DragAndDropList from "$lib/components/DragAndDropList.svelte";
    import { base } from "$app/paths";
    import "drag-drop-touch";

    let fetchStatus: any;
    let allEmotes: Map<string, Emote> = $state(new Map());

    let channel = $derived($page.params.channel);
    let favoriteEmotesStore = $derived(getFavoriteEmotesStore(channel));
    let favoriteCopypastasStore = $derived(getFavoriteCopypastasStore(channel));

    onMount(async () => {
        fetchStatus.run(async () => {
            if (!$twitchApiKey) {
                goto(`${base}/setup`);
                return;
            }

            allEmotes = await loadAllEmotes($twitchApiKey, channel);
        });
    });
</script>

<svelte:head>
    <title>Twitch Emote and Copypasta App - Edit {channel} Favorites</title>
</svelte:head>

<FetchStatus bind:this={fetchStatus} errorPrefix="Failed to load favorite emotes">
    <div class="page-padding edit-container">
        <section class="emotes-section">
            <DragAndDropList store={favoriteEmotesStore} showTrash={true}>
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
                store={favoriteCopypastasStore}
                showTrash={true}
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
</FetchStatus>

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

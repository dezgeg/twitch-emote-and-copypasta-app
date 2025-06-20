<script lang="ts">
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";
    import { loadAllEmotes, getEmoteOrPlaceholder, type Emote } from "$lib/emote-api";
    import { twitchApiKey, getFavoriteEmotesStore } from "$lib/stores";
    import Spinner from "$lib/components/Spinner.svelte";
    import EmoteCard from "$lib/components/EmoteCard.svelte";
    import DragAndDropList from "$lib/components/DragAndDropList.svelte";
    import { base } from "$app/paths";
    import "drag-drop-touch";

    let allEmotes: Map<string, Emote> = $state(new Map());
    let loading = $state(true);
    let error = $state("");

    let channel = $derived($page.params.channel);
    let favoriteEmotesStore = $derived(getFavoriteEmotesStore(channel));

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
                No favorite emotes yet. <a href="{base}/channel/{channel}/add" class="button"
                    >Add some!</a
                >
            </p>
        {/snippet}
    </DragAndDropList>
{/if}

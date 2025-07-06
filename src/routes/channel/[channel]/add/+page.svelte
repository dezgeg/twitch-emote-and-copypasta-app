<script lang="ts">
    import { page } from "$app/stores";
    import { createEmoteDataStore, type EmoteDataStore, type Emote } from "$lib/emote-api";
    import { getFavoriteEmotesStore } from "$lib/stores";
    import EmoteCard from "$lib/components/EmoteCard.svelte";

    let searchTerm = $state("");

    let channel = $derived($page.params.channel);

    // Create our own store instance (will share cached data with layout)
    let allEmotesStore = $derived(createEmoteDataStore(channel));
    let favoriteEmotesStore = $derived(getFavoriteEmotesStore(channel));

    let filteredEmotes: Emote[] = $derived(
        (Object.values($allEmotesStore) as Emote[])
            .filter((emote: Emote) => emote.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .slice(0, 50),
    );

    function toggleFavorite(emote: { name: string; url: string; type: string }) {
        if ($favoriteEmotesStore.includes(emote.name)) {
            $favoriteEmotesStore = $favoriteEmotesStore.filter((name) => name !== emote.name);
        } else {
            $favoriteEmotesStore = [...$favoriteEmotesStore, emote.name];
        }
    }

    function handleSearchKeydown(event: KeyboardEvent) {
        if (event.key === "Enter") {
            // Blur the input to close virtual keyboard on mobile
            (event.target as HTMLInputElement).blur();
        }
    }
</script>

<svelte:head>
    <title>Twitch Emote and Copypasta App - Manage Emotes for {channel}</title>
</svelte:head>

<div class="page-padding">
    <div class="search-container">
        <input
            type="text"
            placeholder="Search emotes..."
            bind:value={searchTerm}
            class="search-input"
            onkeydown={handleSearchKeydown}
        />
        <div class="results-count">
            {#if filteredEmotes.length === 50}
                50+ emotes found (showing first 50)
            {:else}
                {filteredEmotes.length} emotes found
            {/if}
        </div>
    </div>

    <div class="emotes-grid">
        {#each filteredEmotes as emote (emote.name)}
            <EmoteCard
                {emote}
                mode="add"
                isFavorited={$favoriteEmotesStore.includes(emote.name)}
                onClick={toggleFavorite}
            />
        {:else}
            <p>No emotes found matching "{searchTerm}"</p>
        {/each}
    </div>
</div>

<style>
    .search-container {
        display: flex;
        flex-direction: column;
    }

    .search-input {
        padding: 0.75rem;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        font-size: 1rem;
        width: 100%;
        max-width: 400px;
        background-color: var(--bg-secondary);
        color: var(--text-primary);
        box-sizing: border-box;
    }

    .results-count {
        font-size: 0.875rem;
        color: var(--text-secondary);
        margin: 0.5rem 0;
    }

    .emotes-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
        gap: 0.25rem;
    }

    @media (max-width: 600px) {
        .emotes-grid {
            grid-template-columns: repeat(auto-fill, minmax(85px, 1fr));
            gap: 0.125rem;
        }

        .search-input {
            max-width: 100%;
        }
    }
</style>

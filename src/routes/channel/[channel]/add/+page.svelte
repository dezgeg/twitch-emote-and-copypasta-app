<script lang="ts">
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";
    import { loadAllEmotes, type Emote } from "$lib/emote-api";
    import { twitchApiKey, getFavoriteEmotesStore } from "$lib/stores";
    import Spinner from "$lib/components/Spinner.svelte";
    import EmoteCard from "$lib/components/EmoteCard.svelte";
    import NavBar from "$lib/components/NavBar.svelte";
    import { base } from '$app/paths';

    let allEmotes: Emote[] = $state([]);
    let searchTerm = $state("");
    let loading = $state(true);
    let error = $state("");

    let channel = $derived($page.params.channel);
    let favoriteEmotesStore = $derived(getFavoriteEmotesStore(channel));
    let filteredEmotes = $derived(
        allEmotes.filter((emote) => emote.name.toLowerCase().includes(searchTerm.toLowerCase())),
    );

    onMount(async () => {
        await loadEmotes();
    });

    async function loadEmotes() {
        try {
            if (!$twitchApiKey) {
                goto(`${base}/setup`);
                return;
            }

            allEmotes = await loadAllEmotes($twitchApiKey, channel);
        } catch (err) {
            console.error("Error loading emotes:", err);
            error = err instanceof Error ? err.message : "Failed to load emotes";
        } finally {
            loading = false;
        }
    }

    function toggleFavorite(emote: { name: string; url: string; type: string }) {
        const isFavorited = $favoriteEmotesStore.includes(emote.name);

        if (isFavorited) {
            $favoriteEmotesStore = $favoriteEmotesStore.filter((name) => name !== emote.name);
        } else {
            $favoriteEmotesStore = [...$favoriteEmotesStore, emote.name];
        }
    }

    function isFavorited(emoteName: string): boolean {
        return $favoriteEmotesStore.includes(emoteName);
    }
</script>

<svelte:head>
    <title>Twitch Emote and Copypasta App - Manage Emotes for {channel}</title>
</svelte:head>

<main>
    <NavBar {channel} />

    <h1>Manage Emotes for {channel}</h1>

    {#if loading}
        <Spinner />
    {:else if error}
        <div class="error">
            <p>Error: {error}</p>
        </div>
    {:else}
        <div class="search-container">
            <input
                type="text"
                placeholder="Search emotes..."
                bind:value={searchTerm}
                class="search-input"
            />
            <div class="results-count">
                {filteredEmotes.length} emotes found
            </div>
        </div>

        <div class="emotes-grid">
            {#each filteredEmotes as emote (emote.uniqueKey)}
                <EmoteCard 
                    {emote} 
                    mode="add" 
                    isFavorited={isFavorited(emote.name)}
                    onToggleFavorite={toggleFavorite}
                />
            {:else}
                <p>No emotes found matching "{searchTerm}"</p>
            {/each}
        </div>
    {/if}
</main>

<style>
    .search-container {
        margin: 2rem 0;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
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
    }

    .results-count {
        font-size: 0.875rem;
        color: var(--text-secondary);
    }

    .emotes-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        gap: 1rem;
        margin: 2rem 0;
    }

    @media (max-width: 600px) {
        .emotes-grid {
            grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
        }

        .search-input {
            max-width: 100%;
        }
    }
</style>

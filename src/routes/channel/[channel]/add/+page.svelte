<script lang="ts">
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";
    import { loadAllEmotes, type Emote } from "$lib/emote-api";
    import { twitchApiKey, getFavoriteEmotesStore } from "$lib/stores";
    import FetchStatus from "$lib/components/FetchStatus.svelte";
    import EmoteCard from "$lib/components/EmoteCard.svelte";
    import { base } from "$app/paths";

    let fetchStatus: any;
    let allEmotes: Map<string, Emote> = $state(new Map());
    let searchTerm = $state("");

    let channel = $derived($page.params.channel);
    let favoriteEmotesStore = $derived(getFavoriteEmotesStore(channel));
    let filteredEmotes = $derived(
        Array.from(allEmotes.values()).filter((emote) =>
            emote.name.toLowerCase().includes(searchTerm.toLowerCase()),
        ),
    );

    onMount(async () => {
        fetchStatus.run(async () => {
            if (!$twitchApiKey) {
                goto(`${base}/setup`);
                return;
            }

            allEmotes = await loadAllEmotes($twitchApiKey, channel);
        });
    });

    function toggleFavorite(emote: { name: string; url: string; type: string }) {
        const isFavorited = $favoriteEmotesStore.includes(emote.name);

        if (isFavorited) {
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

<FetchStatus bind:this={fetchStatus} errorPrefix="Failed to load emotes">
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
                {filteredEmotes.length} emotes found
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
</FetchStatus>

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

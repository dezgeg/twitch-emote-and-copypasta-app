<script lang="ts">
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";
    import { loadAllEmotes, type Emote } from "$lib/emote-api";
    import { twitchApiKey } from "$lib/stores";
    import Spinner from "$lib/components/Spinner.svelte";

    let allEmotes: Emote[] = $state([]);
    let searchTerm = $state("");
    let loading = $state(true);
    let error = $state("");

    // Use $derived for reactive channel value
    let channel = $derived($page.params.channel);

    // Reactive filtering using Svelte 5 $derived
    let filteredEmotes = $derived(
        allEmotes.filter((emote) => emote.name.toLowerCase().includes(searchTerm.toLowerCase())),
    );

    onMount(async () => {
        await loadEmotes();
    });

    async function loadEmotes() {
        try {
            if (!$twitchApiKey) {
                goto("/setup");
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

    function addToFavorites(emote: { id: string; name: string; url: string; type: string }) {
        const favoriteNames = getFavoriteNames();

        // Check if already exists
        if (favoriteNames.includes(emote.name)) {
            alert(`${emote.name} is already in your favorites!`);
            return;
        }

        // Add emote name to favorites
        favoriteNames.push(emote.name);
        saveFavoriteNames(favoriteNames);

        alert(`Added ${emote.name} to favorites!`);
    }

    function getFavoriteNames(): string[] {
        const stored = localStorage.getItem(`favorites_${channel}`);
        if (!stored) return [];

        return JSON.parse(stored);
    }

    function saveFavoriteNames(favoriteNames: string[]) {
        localStorage.setItem(`favorites_${channel}`, JSON.stringify(favoriteNames));
    }
</script>

<svelte:head>
    <title>Emote App - Add Emotes to {channel}</title>
</svelte:head>

<main>
    <nav>
        <a href="/">Channels</a>
        <span class="separator">›</span>
        <a href="/channel/{channel}">{channel}</a>
        <span class="separator">›</span>
        <span>Add Emotes</span>
    </nav>

    <h1>Add Emotes to {channel}</h1>

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
            {#each filteredEmotes as emote}
                <button class="emote-card" onclick={() => addToFavorites(emote)}>
                    <img src={emote.url} alt={emote.name} />
                    <span class="emote-name">{emote.name}</span>
                    <span class="emote-type {emote.type === '7tv' ? 'seventv' : emote.type}"
                        >{emote.type === "bttv"
                            ? "BTTV"
                            : emote.type === "ffz"
                              ? "FFZ"
                              : emote.type.toUpperCase()}</span
                    >
                </button>
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
        border: 1px solid #ccc;
        border-radius: 8px;
        font-size: 1rem;
        width: 100%;
        max-width: 400px;
    }

    .results-count {
        font-size: 0.875rem;
        color: #666;
    }

    .emotes-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        gap: 1rem;
        margin: 2rem 0;
    }

    .emote-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 1rem;
        border: 1px solid #ccc;
        border-radius: 8px;
        background: white;
        cursor: pointer;
        text-align: center;
        transition: all 0.2s;
    }

    .emote-card:hover {
        background: #f5f5f5;
        border-color: #999;
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }

    .emote-card img {
        width: 56px;
        height: 56px;
        margin-bottom: 0.5rem;
    }

    .emote-name {
        font-size: 0.875rem;
        font-weight: bold;
        margin-bottom: 0.25rem;
        word-break: break-word;
    }

    .emote-type {
        font-size: 0.75rem;
        padding: 0.2rem 0.4rem;
        border-radius: 12px;
        font-weight: bold;
        text-transform: uppercase;
    }

    .emote-type.twitch {
        background: #9146ff;
        color: white;
    }

    .emote-type.seventv {
        background: #00f5ff;
        color: black;
    }

    .emote-type.bttv {
        background: #d50000;
        color: white;
    }

    .emote-type.ffz {
        background: #755000;
        color: white;
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

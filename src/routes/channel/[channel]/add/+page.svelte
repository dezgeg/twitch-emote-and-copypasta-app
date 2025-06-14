<script lang="ts">
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";
    import { getUser } from "$lib/twitch-api";
    import { TWITCH_CLIENT_ID } from "$lib/config";

    let twitchEmotes: Array<{ id: string; name: string; url: string; type: "twitch" }> = [];
    let seventvEmotes: Array<{ id: string; name: string; url: string; type: "7tv" }> = [];
    let allEmotes: Array<{ id: string; name: string; url: string; type: "twitch" | "7tv" }> =
        $state([]);
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
            const apiKey = localStorage.getItem("twitchApiKey");
            if (!apiKey) {
                goto("/setup");
                return;
            }

            // Get broadcaster info first, then load both emote sources
            const broadcaster = await getUser(apiKey, channel);
            // Load both Twitch and 7TV emotes in parallel
            await Promise.all([
                loadTwitchEmotes(apiKey, broadcaster.id),
                load7TVEmotes(broadcaster.id),
            ]);

            allEmotes = [...twitchEmotes, ...seventvEmotes];
        } catch (err) {
            console.error("Error loading emotes:", err);
            error = err instanceof Error ? err.message : "Failed to load emotes";
        } finally {
            loading = false;
        }
    }

    async function loadTwitchEmotes(apiKey: string, broadcasterId: string) {
        try {
            // First get the current user's ID
            const currentUser = await getUser(apiKey);
            const userId = currentUser.id;

            // Get all available emote sources in parallel
            const requests = [
                // Global emotes
                fetch("https://api.twitch.tv/helix/chat/emotes/global", {
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        "Client-Id": TWITCH_CLIENT_ID,
                    },
                }),
            ];

            // Add user emotes (includes channel and subscriber emotes)
            requests.push(
                fetch(
                    `https://api.twitch.tv/helix/chat/emotes/user?broadcaster_id=${broadcasterId}&user_id=${userId}`,
                    {
                        headers: {
                            Authorization: `Bearer ${apiKey}`,
                            "Client-Id": TWITCH_CLIENT_ID,
                        },
                    },
                ),
            );

            const responses = await Promise.all(requests);
            let allTwitchEmotes: any[] = [];

            // Process global emotes
            if (responses[0].ok) {
                const globalData = await responses[0].json();
                const globalEmotes = globalData.data.map((emote: any) => ({
                    id: `global_${emote.id}`,
                    name: emote.name,
                    url: emote.images.url_2x || emote.images.url_1x,
                    type: "twitch" as const,
                    source: "Global",
                }));
                allTwitchEmotes = [...allTwitchEmotes, ...globalEmotes];
            }

            // Process user emotes (includes channel and subscriber emotes)
            if (responses[1].ok) {
                const userData = await responses[1].json();
                const userEmotes = userData.data.map((emote: any) => {
                    // User emotes use template URL format
                    const url = userData.template
                        .replace("{{id}}", emote.id)
                        .replace("{{format}}", emote.format[0] || "static")
                        .replace("{{theme_mode}}", emote.theme_mode[0] || "light")
                        .replace("{{scale}}", "2.0");

                    return {
                        id: `user_${emote.id}`,
                        name: emote.name,
                        url: url,
                        type: "twitch" as const,
                        source: "Available",
                    };
                });
                allTwitchEmotes = [...allTwitchEmotes, ...userEmotes];
            }

            twitchEmotes = allTwitchEmotes;
        } catch (err) {
            console.error("Error loading Twitch emotes:", err);
        }
    }

    async function load7TVEmotes(broadcasterId: string) {
        try {
            // Get 7TV emotes for the channel using broadcaster ID
            const response = await fetch(`https://7tv.io/v3/users/twitch/${broadcasterId}`);

            if (response.ok) {
                const data = await response.json();
                if (data.emote_set?.emotes) {
                    seventvEmotes = data.emote_set.emotes.map((emote: any) => ({
                        id: emote.id,
                        name: emote.name,
                        url: `https://cdn.7tv.app/emote/${emote.id}/2x.webp`,
                        type: "7tv" as const,
                    }));
                }
            } else if (response.status === 404) {
                // Channel doesn't have 7TV emotes set up - this is normal
                console.log(
                    `Channel ${channel} (ID: ${broadcasterId}) does not have 7TV emotes configured`,
                );
                seventvEmotes = [];
            } else {
                console.warn(
                    `7TV API returned ${response.status} for channel ${channel} (ID: ${broadcasterId})`,
                );
                seventvEmotes = [];
            }
        } catch (err) {
            // Network error or other issues - don't show error to user
            console.log(
                "7TV emotes not available:",
                err instanceof Error ? err.message : "Unknown error",
            );
            seventvEmotes = [];
        }
    }

    function addToFavorites(emote: { id: string; name: string; url: string; type: string }) {
        const favorites = getFavorites();

        // Check if already exists
        if (favorites.find((fav) => fav.id === emote.id)) {
            alert(`${emote.name} is already in your favorites!`);
            return;
        }

        // Add to favorites
        favorites.push(emote);
        saveFavorites(favorites);

        alert(`Added ${emote.name} to favorites!`);
    }

    function getFavorites() {
        const stored = localStorage.getItem(`favorites_${channel}`);
        return stored ? JSON.parse(stored) : [];
    }

    function saveFavorites(favorites: any[]) {
        localStorage.setItem(`favorites_${channel}`, JSON.stringify(favorites));
    }

    function goBack() {
        goto(`/channel/${channel}`);
    }
</script>

<svelte:head>
    <title>Emote App - Add Emotes to {channel}</title>
</svelte:head>

<main>
    <h1>Add Emotes to {channel}</h1>

    {#if loading}
        <p>Loading emotes...</p>
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
                <button class="emote-card" on:click={() => addToFavorites(emote)}>
                    <img src={emote.url} alt={emote.name} />
                    <span class="emote-name">{emote.name}</span>
                    <span class="emote-type {emote.type === '7tv' ? 'seventv' : emote.type}"
                        >{emote.type.toUpperCase()}</span
                    >
                </button>
            {:else}
                <p>No emotes found matching "{searchTerm}"</p>
            {/each}
        </div>
    {/if}

    <nav>
        <button on:click={goBack}>Back to {channel} Favorites</button>
    </nav>
</main>

<style>
    main {
        padding: 1rem;
        max-width: 1200px;
        margin: 0 auto;
    }

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

    .error {
        padding: 1rem;
        background: #fee;
        border: 1px solid #fcc;
        border-radius: 8px;
        color: #c00;
        text-align: center;
        margin: 2rem 0;
    }

    nav {
        text-align: center;
        margin-top: 2rem;
    }

    button {
        padding: 0.5rem 1rem;
        border: 1px solid #ccc;
        border-radius: 4px;
        background: white;
        cursor: pointer;
    }

    nav button:hover {
        background: #f5f5f5;
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

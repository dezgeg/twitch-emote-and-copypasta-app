<script lang="ts">
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";
    import { loadAllEmotes, type Emote } from "$lib/emote-api";

    let channel: string;
    let favoriteEmoteNames: string[] = [];
    let favoriteEmotes: Emote[] = [];
    let loading = true;
    let error = "";

    $: channel = $page.params.channel;

    onMount(async () => {
        await loadFavoriteEmotes();
    });

    async function loadFavoriteEmotes() {
        try {
            // Load favorite emote names from localStorage
            const stored = localStorage.getItem(`favorites_${channel}`);
            if (stored) {
                const storedData = JSON.parse(stored);
                // Handle both old format (full objects) and new format (just names)
                favoriteEmoteNames =
                    Array.isArray(storedData) && typeof storedData[0] === "string"
                        ? storedData
                        : storedData.map((emote: any) => emote.name);
            } else {
                favoriteEmoteNames = [];
            }

            // If we have favorite emotes, fetch their current URLs
            if (favoriteEmoteNames.length > 0) {
                await fetchEmoteUrls();
            }
        } catch (err) {
            console.error("Error loading favorite emotes:", err);
            error = err instanceof Error ? err.message : "Failed to load favorites";
        } finally {
            loading = false;
        }
    }

    async function fetchEmoteUrls() {
        try {
            const apiKey = localStorage.getItem("twitchApiKey");
            if (!apiKey) {
                // If no API key, show emotes without images
                favoriteEmotes = favoriteEmoteNames.map((name) => ({
                    id: name,
                    name,
                    url: "",
                    type: "twitch" as const,
                }));
                return;
            }

            // Fetch all available emotes
            const allEmotes = await loadAllEmotes(apiKey, channel);

            // Match favorite names with current emote data
            favoriteEmotes = favoriteEmoteNames.map((name) => {
                const emote = allEmotes.find((e) => e.name === name);
                return (
                    emote || {
                        id: name,
                        name,
                        url: "", // Emote not found, show without image
                        type: "twitch" as const,
                    }
                );
            });
        } catch (err) {
            console.error("Error fetching emote URLs:", err);
            // If API fails, show emotes without images
            favoriteEmotes = favoriteEmoteNames.map((name) => ({
                id: name,
                name,
                url: "",
                type: "twitch" as const,
            }));
        }
    }

    function sendEmoteToChat(emote: { id: string; name: string; url: string }) {
        console.log(`Sending emote to chat: ${emote.name}`);
        alert(`Would send "${emote.name}" to ${channel}'s chat`);
    }
</script>

<svelte:head>
    <title>Emote App - {channel} Favorites</title>
</svelte:head>

<main>
    <h1>{channel} - Favorite Emotes</h1>

    {#if loading}
        <p>Loading...</p>
    {:else if error}
        <div class="error">
            <p>Error: {error}</p>
        </div>
    {:else}
        <div class="emotes-grid">
            {#each favoriteEmotes as emote}
                <button class="emote-button" on:click={() => sendEmoteToChat(emote)}>
                    {#if emote.url}
                        <img src={emote.url} alt={emote.name} />
                    {:else}
                        <div class="emote-placeholder">{emote.name[0]?.toUpperCase()}</div>
                    {/if}
                    <span>{emote.name}</span>
                </button>
            {:else}
                <p>
                    No favorite emotes yet. <a href="/channel/{channel}/add" class="button"
                        >Add some!</a
                    >
                </p>
            {/each}
        </div>

        <nav>
            <a href="/channel/{channel}/edit" class="button">Edit Favorites</a>
            <a href="/channel/{channel}/add" class="button">Add Emotes</a>
            <a href="/" class="button">Back to Channels</a>
        </nav>
    {/if}
</main>

<style>
    main {
        max-width: 800px;
    }

    .emotes-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
        gap: 1rem;
        margin: 2rem 0;
    }

    .emote-button {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 1rem;
        border: 1px solid #ccc;
        border-radius: 8px;
        background: white;
        cursor: pointer;
        text-align: center;
    }

    .emote-button:hover {
        background: #f5f5f5;
        border-color: #999;
    }

    .emote-button img,
    .emote-placeholder {
        width: 56px;
        height: 56px;
        margin-bottom: 0.5rem;
    }

    .emote-placeholder {
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f0f0f0;
        border: 2px dashed #ccc;
        border-radius: 8px;
        font-size: 1.5rem;
        font-weight: bold;
        color: #666;
    }

    .emote-button span {
        font-size: 0.875rem;
        word-break: break-word;
    }

    nav {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
        justify-content: center;
    }

    .button {
        text-align: center;
    }

    @media (max-width: 600px) {
        .emotes-grid {
            grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
        }

        nav {
            flex-direction: column;
        }

        nav button,
        nav .button {
            width: 100%;
        }
    }
</style>

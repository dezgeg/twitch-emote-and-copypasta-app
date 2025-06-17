<script lang="ts">
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";
    import { loadAllEmotes, type Emote } from "$lib/emote-api";
    import { twitchApiKey, getFavoriteEmotesStore } from "$lib/stores";
    import Spinner from "$lib/components/Spinner.svelte";
    import EmoteCard from "$lib/components/EmoteCard.svelte";
    import { base } from '$app/paths';

    let channel: string;
    let favoriteEmotes: Emote[] = [];
    let loading = true;
    let error = "";

    $: channel = $page.params.channel;
    $: favoriteEmotesStore = getFavoriteEmotesStore(channel);

    onMount(async () => {
        await loadFavoriteEmotes();
    });

    async function loadFavoriteEmotes() {
        try {
            // If we have favorite emotes, fetch their current URLs
            if ($favoriteEmotesStore.length > 0) {
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
            if (!$twitchApiKey) {
                goto(`${base}/setup`);
                return;
            }

            // Fetch all available emotes
            const allEmotes = await loadAllEmotes($twitchApiKey, channel);

            // Match favorite names with current emote data
            favoriteEmotes = $favoriteEmotesStore.map((name) => {
                const emote = allEmotes.find((e) => e.name === name);
                return (
                    emote || {
                        name,
                        url: "", // Emote not found, show without image
                        type: "twitch" as const,
                        uniqueKey: `missing-${name}`,
                    }
                );
            });
        } catch (err) {
            console.error("Error fetching emote URLs:", err);
            // If API fails, show emotes without images
            favoriteEmotes = $favoriteEmotesStore.map((name) => ({
                name,
                url: "",
                type: "twitch" as const,
                uniqueKey: `fallback-${name}`,
            }));
        }
    }

    function sendEmoteToChat(emote: { name: string; url: string }) {
        console.log(`Sending emote to chat: ${emote.name}`);
        alert(`Would send "${emote.name}" to ${channel}'s chat`);
    }
</script>

<svelte:head>
    <title>Twitch Emote and Copypasta App - {channel} Favorites</title>
</svelte:head>

    {#if loading}
        <Spinner />
    {:else if error}
        <div class="error">
            <p>Error: {error}</p>
        </div>
    {:else}
        <div class="emotes-grid">
            {#each favoriteEmotes as emote (emote.uniqueKey)}
                <EmoteCard 
                    {emote} 
                    mode="view" 
                    onClick={sendEmoteToChat}
                />
            {:else}
                <p>
                    No favorite emotes yet. <a href="{base}/channel/{channel}/add" class="button"
                        >Add some!</a
                    >
                </p>
            {/each}
        </div>
    {/if}

<style>
    .emotes-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(50px, 1fr));
        gap: 0.125rem;
        margin: 1rem 0;
    }

    @media (max-width: 600px) {
        .emotes-grid {
            grid-template-columns: repeat(auto-fill, minmax(45px, 1fr));
            gap: 0.0625rem;
        }

        nav {
            flex-direction: column;
        }
    }
</style>

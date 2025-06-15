<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { getFollowedChannels, type FollowedChannel } from "$lib/twitch-api";
    import { twitchApiKey } from "$lib/stores";

    let channels: FollowedChannel[] = [];
    let loading = true;
    let error = "";

    onMount(async () => {
        if (!$twitchApiKey) {
            goto("/setup");
            return;
        }

        await loadChannels();
    });

    async function loadChannels() {
        try {
            channels = await getFollowedChannels($twitchApiKey);
        } catch (err) {
            console.error("Error fetching channels:", err);
            error = err instanceof Error ? err.message : "Failed to fetch channels";
        } finally {
            loading = false;
        }
    }
</script>

<svelte:head>
    <title>Emote App - Channels</title>
</svelte:head>

<main>
    <nav>
        <span>Channels</span>
        <span class="separator">•</span>
        <a href="/setup">Setup</a>
    </nav>

    <h1>Your Followed Channels</h1>

    {#if loading}
        <p>Loading channels...</p>
    {:else if error}
        <div class="error">
            <p>Error: {error}</p>
            <p>Please check your API key configuration.</p>
        </div>
    {:else}
        <div class="channels">
            {#each channels as channel}
                <a class="channel-card" href="/channel/{channel.broadcaster_login}">
                    <div class="channel-name">{channel.broadcaster_name}</div>
                </a>
            {:else}
                <p>No followed channels found.</p>
            {/each}
        </div>
    {/if}
</main>

<style>
    .channels {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 1rem;
        margin: 2rem 0;
    }

    .channel-card {
        padding: 1rem;
        border: 1px solid #ccc;
        border-radius: 8px;
        background: white;
        cursor: pointer;
        font-size: 1rem;
        text-decoration: none;
        display: block;
        color: inherit;
    }

    .channel-card:hover {
        background: #f5f5f5;
    }

    .channel-name {
        font-weight: bold;
        margin-bottom: 0.25rem;
    }
</style>

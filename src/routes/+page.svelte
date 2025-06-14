<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { getUser } from "$lib/twitch-api";
    import { TWITCH_CLIENT_ID } from "$lib/config";

    let channels: Array<{
        broadcaster_id: string;
        broadcaster_login: string;
        broadcaster_name: string;
    }> = [];
    let loading = true;
    let error = "";

    onMount(async () => {
        const apiKey = localStorage.getItem("twitchApiKey");
        if (!apiKey) {
            goto("/setup");
            return;
        }

        await fetchFollowedChannels(apiKey);
    });

    async function fetchFollowedChannels(apiKey: string) {
        try {
            // First get user info to get user ID
            const user = await getUser(apiKey);

            // Get followed channels
            const followsResponse = await fetch(
                `https://api.twitch.tv/helix/channels/followed?user_id=${user.id}`,
                {
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        "Client-Id": TWITCH_CLIENT_ID,
                    },
                },
            );

            if (!followsResponse.ok) {
                throw new Error(`Failed to get followed channels: ${followsResponse.status}`);
            }

            const followsData = await followsResponse.json();
            channels = followsData.data || [];
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
    <h1>Your Followed Channels</h1>

    {#if loading}
        <p>Loading channels...</p>
    {:else if error}
        <div class="error">
            <p>Error: {error}</p>
            <p>Please check your API key configuration.</p>
        </div>
        <nav>
            <a href="/setup" class="button">Setup</a>
        </nav>
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

        <nav>
            <a href="/setup" class="button">Setup</a>
        </nav>
    {/if}
</main>

<style>
    main {
        padding: 1rem;
        max-width: 800px;
        margin: 0 auto;
    }

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
        margin-top: 2rem;
        text-align: center;
    }

    button,
    .button {
        padding: 0.5rem 1rem;
        border: 1px solid #ccc;
        border-radius: 4px;
        background: white;
        cursor: pointer;
        text-decoration: none;
        display: inline-block;
        color: inherit;
    }

    button:hover,
    .button:hover {
        background: #f5f5f5;
    }
</style>

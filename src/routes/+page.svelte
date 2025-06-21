<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { getFollowedChannels, type FollowedChannel } from "$lib/twitch-api";
    import { twitchApiKey } from "$lib/stores";
    import Spinner from "$lib/components/Spinner.svelte";
    import { base } from "$app/paths";

    let channels: FollowedChannel[] = [];
    let loading = true;
    let error = "";

    onMount(async () => {
        if (!$twitchApiKey) {
            goto(`${base}/setup`);
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
    <title>Twitch Emote and Copypasta App - Channels</title>
</svelte:head>

{#if loading}
    <Spinner />
{:else if error}
    <div class="error">
        <p>Error: {error}</p>
        <p>Please check your API key configuration.</p>
    </div>
{:else}
    <div class="page-padding channels">
        {#each channels as channel (channel.broadcaster_id)}
            <a class="channel-card" href="{base}/channel/{channel.broadcaster_login}">
                <div class="channel-name">{channel.broadcaster_name}</div>
            </a>
        {:else}
            <p>No followed channels found.</p>
        {/each}
    </div>
{/if}

<style>
    .channels {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 1rem;
    }

    .channel-card {
        padding: 1rem;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        background: var(--bg-secondary);
        cursor: pointer;
        font-size: 1rem;
        text-decoration: none;
        display: block;
        color: var(--text-primary);
        transition: background-color 0.2s ease;
    }

    .channel-card:hover {
        background: var(--bg-tertiary);
    }

    .channel-name {
        font-weight: bold;
        margin-bottom: 0.25rem;
    }
</style>

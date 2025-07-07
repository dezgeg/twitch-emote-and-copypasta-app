<script lang="ts">
    import { onMount } from "svelte";
    import {
        getFollowedStreams,
        getFollowedChannels,
        type Stream,
        type FollowedChannel,
    } from "$lib/twitch-api";
    import { requireAuth } from "$lib/auth-guard";
    import FetchStatus from "$lib/components/FetchStatus.svelte";
    import { base } from "$app/paths";

    let fetchStatus: any;
    let streams: Stream[] = [];
    let offlineChannels: FollowedChannel[] = [];

    onMount(async () => {
        fetchStatus.run(async () => {
            const token = await requireAuth();

            // Load both live streams and all followed channels
            const [liveStreams, allChannels] = await Promise.all([
                getFollowedStreams(token),
                getFollowedChannels(token),
            ]);

            streams = liveStreams;

            // Filter out channels that are currently live
            const liveChannelIds = new Set(liveStreams.map((stream) => stream.user_id));
            offlineChannels = allChannels.filter(
                (channel) => !liveChannelIds.has(channel.broadcaster_id),
            );
        });
    });

    function formatViewerCount(count: number): string {
        if (count >= 1000000) {
            return `${(count / 1000000).toFixed(1)}M`;
        } else if (count >= 1000) {
            return `${(count / 1000).toFixed(1)}K`;
        }
        return count.toString();
    }

    function getTimeSinceStart(startedAt: string): string {
        const start = new Date(startedAt);
        const now = new Date();
        const diff = now.getTime() - start.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    }
</script>

<svelte:head>
    <title>Twitch Emote and Copypasta App - Channels</title>
</svelte:head>

<FetchStatus bind:this={fetchStatus} errorPrefix="Failed to load streams and channels">
    <div class="page-padding">
        <!-- Live Streams -->
        <div class="streams-grid">
            {#each streams as stream (stream.id)}
                <a class="stream-card live" href="{base}/channel/{stream.user_login}">
                    <div class="stream-info">
                        <div class="stream-header">
                            <div class="channel-name">{stream.user_name}</div>
                            <div class="stream-stats">
                                <span class="viewer-count"
                                    >👥 {formatViewerCount(stream.viewer_count)}</span
                                >
                                <span class="duration"
                                    >⏱️ {getTimeSinceStart(stream.started_at)}</span
                                >
                            </div>
                        </div>
                        <div class="stream-title">{stream.title}</div>
                        <div class="stream-meta">
                            {#if stream.game_name}
                                <div class="game-name">{stream.game_name}</div>
                            {/if}
                        </div>
                    </div>
                </a>
            {/each}
        </div>

        <!-- Offline Channels -->
        <div class="channels-grid">
            {#each offlineChannels as channel (channel.broadcaster_id)}
                <a class="channel-card offline" href="{base}/channel/{channel.broadcaster_login}">
                    <div class="channel-name">{channel.broadcaster_name}</div>
                    <div class="offline-status">Offline</div>
                </a>
            {/each}
        </div>
    </div>
</FetchStatus>

<style>
    .streams-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 1rem;
        margin-bottom: 3rem;
    }

    .channels-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 1rem;
        margin-bottom: 3rem;
    }

    .stream-card {
        text-decoration: none;
        color: var(--text-primary);
        background: var(--bg-secondary);
        border-radius: 8px;
        transition:
            transform 0.2s ease,
            box-shadow 0.2s ease;
        border: 1px solid var(--border-color);
        padding: 1rem;
    }

    .stream-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    .stream-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.75rem;
    }

    .stream-stats {
        display: flex;
        gap: 0.75rem;
        font-size: 0.75rem;
        color: var(--text-secondary);
    }

    .viewer-count,
    .duration {
        font-weight: bold;
    }

    .stream-title {
        font-weight: normal;
        margin-bottom: 0.5rem;
        font-size: 0.875rem;
        line-height: 1.3;
        overflow: hidden;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        line-clamp: 2;
        color: var(--text-primary);
    }

    .stream-meta {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .channel-name {
        font-weight: bold;
        color: var(--accent-primary);
    }

    .game-name {
        color: var(--text-secondary);
        font-size: 0.875rem;
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

    .channel-card .channel-name {
        color: var(--text-primary);
        margin-bottom: 0.5rem;
    }

    .offline-status {
        color: var(--text-secondary);
        font-size: 0.875rem;
    }

    @media (max-width: 768px) {
        .streams-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
        }

        .channels-grid {
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        }

        .stream-card {
            padding: 0.75rem;
        }

        .stream-title {
            font-size: 0.8rem;
        }

        .stream-stats {
            gap: 0.5rem;
        }
    }
</style>

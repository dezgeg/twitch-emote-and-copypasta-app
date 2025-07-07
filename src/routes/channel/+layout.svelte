<script lang="ts">
    import { page } from "$app/stores";
    import { onMount } from "svelte";
    import { createEmoteDataStore, type EmoteDataStore } from "$lib/emote-api";
    import { requireAuth } from "$lib/auth-guard";
    import ChatPanel from "$lib/components/ChatPanel.svelte";
    import FetchStatus from "$lib/components/FetchStatus.svelte";

    let fetchStatus: any;

    let channel = $derived($page.params.channel);

    // Initialize emote store directly
    let allEmotesStore = $derived(createEmoteDataStore(channel));

    onMount(async () => {
        fetchStatus.run(async () => {
            const token = await requireAuth();
            await allEmotesStore.lazyFetch(token);
        });
    });

    interface Props {
        children: import("svelte").Snippet;
    }

    let { children }: Props = $props();
</script>

<FetchStatus bind:this={fetchStatus} errorPrefix="Failed to load channel data">
    <div class="main-container">
        <div class="content">
            {@render children()}
        </div>

        <ChatPanel {channel} {allEmotesStore} />
    </div>
</FetchStatus>

<style>
    .main-container {
        display: flex;
        flex-direction: column;
        height: calc(100vh - var(--nav-height, 32px));
    }

    .content {
        flex: 1;
        overflow-y: auto;
    }

    /* Wide desktop layout - horizontal sidebar */
    @media (min-width: 769px) {
        .main-container {
            flex-direction: row;
        }

        .content {
            flex: 1;
            border-right: 1px solid var(--border-color);
        }
    }

    /* Narrow layouts (mobile or constrained width) stay vertical */
    @media (max-width: 768px) {
        .main-container {
            overflow: hidden;
            width: 100%;
        }
    }
</style>

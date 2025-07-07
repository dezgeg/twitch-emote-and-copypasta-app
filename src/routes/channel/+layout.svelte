<script lang="ts">
    import { page } from "$app/stores";
    import { onMount } from "svelte";
    import { createEmoteDataStore, type EmoteDataStore } from "$lib/emote-api";
    import { requireAuth } from "$lib/auth-guard";
    import ChatPanel from "$lib/components/ChatPanel.svelte";
    import FetchStatus from "$lib/components/FetchStatus.svelte";
    import { isInIframe } from "$lib/utils";

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
    <div class="main-container" class:iframe={isInIframe()}>
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
        height: calc(100vh - var(--nav-height, 1cm));
    }

    .main-container.iframe {
        height: calc(100vh - 48px);
        flex-direction: column;
        overflow: hidden;
        width: 100%;
    }

    .content {
        flex: 1;
        overflow-y: auto;
    }

    /* Desktop layout - sidebar */
    @media (min-width: 1024px) {
        .main-container:not(.iframe) {
            flex-direction: row;
        }

        .main-container:not(.iframe) .content {
            flex: 1;
            border-right: 1px solid var(--border-color);
        }

        /* In iframe, keep vertical layout even on desktop for better fit */
        .main-container.iframe {
            flex-direction: column;
        }
    }
</style>

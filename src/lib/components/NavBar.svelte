<script lang="ts">
    import { base } from "$app/paths";
    import { page } from "$app/stores";
    import { browser } from "$app/environment";

    interface Props {
        channel?: string | null;
    }

    let { channel = null }: Props = $props();

    // Get current route ID for highlighting active nav item
    let routeId = $derived($page.route.id);

    // Detect if running in iframe
    let isInIframe = $derived(browser && window.self !== window.top);

    function closeIframe() {
        // Post message to parent window to close the iframe
        if (browser && window.parent) {
            window.parent.postMessage("closeEmoteOverlay", "*");
        }
    }
</script>

<nav class:iframe={isInIframe}>
    {#if isInIframe}
        <button class="close-button" onclick={closeIframe} title="Close overlay">×</button>
    {:else}
        <a href="{base}/" class:active={routeId === "/"}>📺</a>
    {/if}

    {#if channel}
        <a
            href="{base}/channel/{channel}"
            class:active={routeId === "/channel/[channel]"}
            title={isInIframe ? `Channel: ${channel}` : undefined}>{isInIframe ? "🎮" : channel}</a
        >
        <a
            href="{base}/channel/{channel}/add"
            class:active={routeId === "/channel/[channel]/add"}
            title="Add emotes">➕</a
        >
        <a
            href="{base}/channel/{channel}/edit"
            class:active={routeId === "/channel/[channel]/edit"}
            title="Edit favorites">✏️</a
        >
    {:else}
        <a href="{base}/setup" class:active={routeId === "/setup"} title="Setup">⚙️</a>
    {/if}
</nav>

<style>
    nav {
        display: flex;
        align-items: stretch;
        height: 1cm;
        margin: 0;
        background: #2f2f2f;
        border-bottom: 1px solid #5f5f5f;
        font-family: monospace;
        font-size: 0.875rem;
        flex-wrap: nowrap;
        overflow-x: auto;
        width: 100%;
        gap: 0;
    }

    nav.iframe {
        height: 48px;
        padding-left: 0;
        overflow: hidden;
        box-sizing: border-box;
    }

    nav a {
        color: #ffffff;
        text-decoration: none;
        font-weight: normal;
        padding: 0 1rem;
        background: #404040;
        border-right: 1px solid #5f5f5f;
        display: flex;
        align-items: center;
        white-space: nowrap;
        transition: background-color 0.1s ease;
    }

    nav.iframe a {
        padding: 0 0.5rem;
        font-size: 0.75rem;
        min-width: auto;
        flex-shrink: 1;
        box-sizing: border-box;
    }

    .close-button {
        width: 48px;
        height: 48px;
        background: #9146ff;
        color: white;
        border: none;
        font-size: 20px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        border-right: 1px solid #5f5f5f;
        transition: background-color 0.1s ease;
        flex-shrink: 0;
    }

    .close-button:hover {
        background: #772ce8;
    }

    nav a:hover {
        background: #606060;
        color: #ffffff;
    }

    nav a.active {
        background: #9146ff;
        color: #ffffff;
    }

    nav a.active:hover {
        background: #772ce8;
        color: #ffffff;
    }

    nav a:first-child {
        border-left: 1px solid #5f5f5f;
        padding-left: 1rem;
    }

    @media (max-width: 600px) {
        nav {
            height: auto;
            min-height: 1cm;
            flex-wrap: wrap;
        }

        nav a {
            flex: 1;
            min-width: auto;
            justify-content: center;
            padding: 0 0.5rem;
        }
    }
</style>

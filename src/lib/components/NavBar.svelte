<script lang="ts">
    import { base } from "$app/paths";
    import { page } from "$app/stores";
    import { browser } from "$app/environment";
    import Button from "./Button.svelte";
    import { isInIframe } from "$lib/utils";

    interface Props {
        channel?: string | null;
    }

    let { channel = null }: Props = $props();

    // Get current route ID for highlighting active nav item
    let routeId = $derived($page.route.id);

    function closeIframe() {
        // Post message to parent window to close the iframe
        if (browser && window.parent) {
            window.parent.postMessage("closeEmoteOverlay", "*");
        }
    }
</script>

<nav>
    {#if !isInIframe()}
        <a href="{base}/" class:active={routeId === "/"}>📺</a>
    {/if}

    {#if channel}
        <a
            href="{base}/channel/{channel}"
            class:active={routeId === "/channel/[channel]"}
            title={isInIframe() ? `Channel: ${channel}` : undefined}
            >{isInIframe() ? "🎮" : channel}</a
        >
        <a
            href="{base}/channel/{channel}/add"
            class:active={routeId === "/channel/[channel]/add"}
            title="Add emotes">➕</a
        >
    {:else}
        <a href="{base}/setup" class:active={routeId === "/setup"} title="Setup">⚙️</a>
    {/if}

    {#if isInIframe()}
        <Button
            variant="icon"
            size="small"
            onclick={closeIframe}
            title="Close overlay"
            class="nav-close-button">×</Button
        >
    {/if}
</nav>

<style>
    nav {
        display: flex;
        align-items: stretch;
        height: 32px;
        margin: 0;
        background: #2f2f2f;
        border-bottom: 1px solid #5f5f5f;
        font-family: monospace;
        font-size: 0.875rem;
        flex-wrap: nowrap;
        overflow-x: auto;
        width: 100%;
        gap: 0;
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
        box-sizing: border-box;
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

    /* Layout styling for navigation close button */
    :global(.nav-close-button) {
        border-left: 1px solid #5f5f5f !important;
        margin-left: auto !important;
        flex-shrink: 0 !important;
        font-size: 20px !important;
    }

    /* Narrow layout: mobile screens or constrained width contexts */
    @media (max-width: 768px) {
        nav {
            min-height: 32px;
            flex-wrap: wrap;
            padding-left: 0;
            overflow: hidden;
            box-sizing: border-box;
        }

        nav a {
            flex: 1;
            min-width: auto;
            justify-content: center;
            padding: 0 0.5rem;
            font-size: 0.75rem;
            flex-shrink: 1;
            box-sizing: border-box;
        }
    }
</style>

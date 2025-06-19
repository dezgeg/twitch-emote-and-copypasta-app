<script lang="ts">
    import { base } from "$app/paths";
    import { page } from "$app/stores";

    interface Props {
        channel?: string | null;
    }

    let { channel = null }: Props = $props();

    // Get current route ID for highlighting active nav item
    let routeId = $derived($page.route.id);
</script>

<nav>
    <a href="{base}/" class:active={routeId === "/"}>Channels</a>

    {#if channel}
        <a href="{base}/channel/{channel}" class:active={routeId === "/channel/[channel]"}
            >{channel}</a
        >
        <a href="{base}/channel/{channel}/add" class:active={routeId === "/channel/[channel]/add"}
            >Add</a
        >
        <a href="{base}/channel/{channel}/edit" class:active={routeId === "/channel/[channel]/edit"}
            >Edit</a
        >
        <a href="{base}/channel/{channel}/chat" class:active={routeId === "/channel/[channel]/chat"}
            >Chat</a
        >
    {:else}
        <a href="{base}/setup" class:active={routeId === "/setup"}>Setup</a>
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

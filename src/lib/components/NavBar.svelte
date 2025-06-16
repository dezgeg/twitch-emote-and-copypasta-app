<script lang="ts">
    import { base } from '$app/paths';

    interface Props {
        channel?: string | null;
    }

    let { channel = null }: Props = $props();
</script>

<nav>
    <a href="{base}/">Channels</a>
    
    {#if channel}
        <span class="separator">›</span>
        <a href="{base}/channel/{channel}">{channel}</a>
        <span class="separator">•</span>
        <a href="{base}/channel/{channel}/add">Add</a>
        <span class="separator">•</span>
        <a href="{base}/channel/{channel}/edit">Edit</a>
    {:else}
        <span class="separator">•</span>
        <a href="{base}/setup">Setup</a>
    {/if}
</nav>

<style>
    nav {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 2rem;
        padding: 1rem 0;
        flex-wrap: wrap;
    }

    nav a {
        color: var(--accent-primary);
        text-decoration: none;
        font-weight: 500;
    }

    nav a:hover {
        text-decoration: underline;
    }

    .separator {
        color: var(--text-secondary);
        user-select: none;
    }

    @media (max-width: 600px) {
        nav {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.25rem;
        }
    }
</style>
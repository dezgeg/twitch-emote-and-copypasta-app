<script>
    import { base } from '$app/paths';
    import { page } from '$app/stores';
    import NavBar from '$lib/components/NavBar.svelte';
    
    // Make base available globally for navigation
    export { base };
    
    // Extract channel from page params if it exists
    $: channel = $page.params.channel || null;
</script>

<NavBar {channel} />

<main>
    <slot />
</main>

<style>
    /* Remove global overrides since they're now handled in app.html */
    main {
        max-width: 1200px;
        margin: 0 auto;
        padding: 1rem;
    }
</style>
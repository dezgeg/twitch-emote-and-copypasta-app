<script>
    import { base } from '$app/paths';
    import { page } from '$app/stores';
    import NavBar from '$lib/components/NavBar.svelte';
    
    // Make base available globally for navigation
    export { base };
    
    // Extract channel from page params if it exists
    let channel = $derived($page.params.channel || null);
</script>

<NavBar {channel} />

<main>
    <slot />
</main>


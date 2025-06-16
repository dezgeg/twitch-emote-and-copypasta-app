<script>
    import { base } from '$app/paths';
    import { page } from '$app/stores';
    
    // Make base available globally for navigation
    export { base };
</script>

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
<script>
    import { base } from "$app/paths";
    import { page } from "$app/stores";
    import NavBar from "$lib/components/NavBar.svelte";
    import { SvelteToast } from "@zerodevx/svelte-toast";

    // Make base available globally for navigation
    export { base };

    let { children } = $props();

    // Extract channel from page params if it exists
    let channel = $derived($page.params.channel || null);
</script>

<NavBar {channel} />

<main>
    {@render children()}
</main>

<SvelteToast />

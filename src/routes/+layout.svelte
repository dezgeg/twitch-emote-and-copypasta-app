<script>
    import { base } from "$app/paths";
    import { page } from "$app/stores";
    import { browser } from "$app/environment";
    import { onMount } from "svelte";
    import NavBar from "$lib/components/NavBar.svelte";

    // Make base available globally for navigation
    export { base };

    let { children } = $props();

    // Extract channel from page params if it exists
    let channel = $derived($page.params.channel || null);

    // Detect if running in iframe and apply body class
    onMount(() => {
        if (browser && window.self !== window.top) {
            document.body.classList.add("iframe-mode");
        }
    });
</script>

<NavBar {channel} />

<main>
    {@render children()}
</main>

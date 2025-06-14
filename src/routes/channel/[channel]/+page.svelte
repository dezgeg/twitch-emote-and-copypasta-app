<script lang="ts">
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";

    let channel: string;
    let favoriteEmotes: Array<{ id: string; name: string; url: string }> = [];
    let loading = true;

    $: channel = $page.params.channel;

    onMount(() => {
        loadFavoriteEmotes();
    });

    function loadFavoriteEmotes() {
        const stored = localStorage.getItem(`favorites_${channel}`);
        if (stored) {
            favoriteEmotes = JSON.parse(stored);
        }
        loading = false;
    }

    function sendEmoteToChat(emote: { id: string; name: string; url: string }) {
        console.log(`Sending emote to chat: ${emote.name}`);
        alert(`Would send "${emote.name}" to ${channel}'s chat`);
    }
</script>

<svelte:head>
    <title>Emote App - {channel} Favorites</title>
</svelte:head>

<main>
    <h1>{channel} - Favorite Emotes</h1>

    {#if loading}
        <p>Loading...</p>
    {:else}
        <div class="emotes-grid">
            {#each favoriteEmotes as emote}
                <button class="emote-button" on:click={() => sendEmoteToChat(emote)}>
                    <img src={emote.url} alt={emote.name} />
                    <span>{emote.name}</span>
                </button>
            {:else}
                <p>
                    No favorite emotes yet. <a href="/channel/{channel}/add" class="button"
                        >Add some!</a
                    >
                </p>
            {/each}
        </div>

        <nav>
            <a href="/channel/{channel}/edit" class="button">Edit Favorites</a>
            <a href="/channel/{channel}/add" class="button">Add Emotes</a>
            <a href="/" class="button">Back to Channels</a>
        </nav>
    {/if}
</main>

<style>
    main {
        padding: 1rem;
        max-width: 800px;
        margin: 0 auto;
    }

    .emotes-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
        gap: 1rem;
        margin: 2rem 0;
    }

    .emote-button {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 1rem;
        border: 1px solid #ccc;
        border-radius: 8px;
        background: white;
        cursor: pointer;
        text-align: center;
    }

    .emote-button:hover {
        background: #f5f5f5;
        border-color: #999;
    }

    .emote-button img {
        width: 56px;
        height: 56px;
        margin-bottom: 0.5rem;
    }

    .emote-button span {
        font-size: 0.875rem;
        word-break: break-word;
    }

    nav {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
        justify-content: center;
        margin-top: 2rem;
    }

    button,
    .button {
        padding: 0.5rem 1rem;
        border: 1px solid #ccc;
        border-radius: 4px;
        background: white;
        cursor: pointer;
        text-decoration: none;
        display: inline-block;
        color: inherit;
        text-align: center;
    }

    button:hover,
    .button:hover {
        background: #f5f5f5;
    }

    @media (max-width: 600px) {
        .emotes-grid {
            grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
        }

        nav {
            flex-direction: column;
        }

        nav button,
        nav .button {
            width: 100%;
        }
    }
</style>

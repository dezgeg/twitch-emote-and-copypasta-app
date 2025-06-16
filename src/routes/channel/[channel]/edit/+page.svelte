<script lang="ts">
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";
    import { loadAllEmotes, type Emote } from "$lib/emote-api";
    import { twitchApiKey, getFavoriteEmotesStore } from "$lib/stores";
    import Spinner from "$lib/components/Spinner.svelte";
    import EmoteCard from "$lib/components/EmoteCard.svelte";

    let favoriteEmotes: Emote[] = $state([]);
    let loading = $state(true);
    let error = $state("");
    let draggedIndex = $state<number | null>(null);
    let dragOverIndex = $state<number | null>(null);
    let dragOverTrash = $state(false);

    let channel = $derived($page.params.channel);
    let favoriteEmotesStore = $derived(getFavoriteEmotesStore(channel));

    onMount(async () => {
        await loadFavoriteEmotes();
    });

    async function loadFavoriteEmotes() {
        try {
            if (!$twitchApiKey) {
                goto("/setup");
                return;
            }

            // If we have favorite emotes, fetch their current URLs
            if ($favoriteEmotesStore.length > 0) {
                await fetchEmoteUrls();
            }
        } catch (err) {
            console.error("Error loading favorite emotes:", err);
            error = err instanceof Error ? err.message : "Failed to load favorites";
        } finally {
            loading = false;
        }
    }

    async function fetchEmoteUrls() {
        try {
            // Fetch all available emotes
            const allEmotes = await loadAllEmotes($twitchApiKey, channel);

            // Match favorite names with current emote data in the same order as stored
            favoriteEmotes = $favoriteEmotesStore.map((name) => {
                const emote = allEmotes.find((e) => e.name === name);
                return (
                    emote || {
                        name,
                        url: "", // Emote not found, show without image
                        type: "twitch" as const,
                        uniqueKey: `missing-${name}`,
                    }
                );
            });
        } catch (err) {
            console.error("Error fetching emote URLs:", err);
            // If API fails, show emotes without images
            favoriteEmotes = $favoriteEmotesStore.map((name) => ({
                name,
                url: "",
                type: "twitch" as const,
                uniqueKey: `fallback-${name}`,
            }));
        }
    }

    function removeFromFavorites(emoteName: string) {
        $favoriteEmotesStore = $favoriteEmotesStore.filter(name => name !== emoteName);
        favoriteEmotes = favoriteEmotes.filter(emote => emote.name !== emoteName);
    }

    function removeFromFavoritesByIndex(index: number) {
        const emoteName = favoriteEmotes[index]?.name;
        if (emoteName) {
            removeFromFavorites(emoteName);
        }
    }

    // Drag and drop handlers
    function handleDragStart(event: DragEvent, emote: Emote, index?: number) {
        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/html", "");
        }
        draggedIndex = index ?? null;
    }

    function handleDragOver(event: DragEvent, emote: Emote, index?: number) {
        event.preventDefault();
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = "move";
        }
        dragOverIndex = index ?? null;
    }

    function handleDragLeave() {
        dragOverIndex = null;
    }

    function handleDrop(event: DragEvent, emote: Emote, dropIndex?: number) {
        event.preventDefault();
        
        if (draggedIndex === null || dropIndex === undefined || draggedIndex === dropIndex) {
            draggedIndex = null;
            dragOverIndex = null;
            return;
        }

        // Reorder the arrays
        const newFavoriteEmotes = [...favoriteEmotes];
        const newFavoriteNames = [...$favoriteEmotesStore];
        
        // Remove the dragged item
        const draggedEmote = newFavoriteEmotes.splice(draggedIndex, 1)[0];
        const draggedName = newFavoriteNames.splice(draggedIndex, 1)[0];
        
        // Insert at new position
        newFavoriteEmotes.splice(dropIndex, 0, draggedEmote);
        newFavoriteNames.splice(dropIndex, 0, draggedName);
        
        // Update state
        favoriteEmotes = newFavoriteEmotes;
        $favoriteEmotesStore = newFavoriteNames;
        
        // Reset drag state
        draggedIndex = null;
        dragOverIndex = null;
    }

    function handleDragEnd() {
        draggedIndex = null;
        dragOverIndex = null;
        dragOverTrash = false;
    }

    // Trash can drag handlers
    function handleTrashDragOver(event: DragEvent) {
        event.preventDefault();
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = "move";
        }
        dragOverTrash = true;
    }

    function handleTrashDragLeave() {
        dragOverTrash = false;
    }

    function handleTrashDrop(event: DragEvent) {
        event.preventDefault();
        
        if (draggedIndex !== null) {
            removeFromFavoritesByIndex(draggedIndex);
        }
        
        // Reset drag state
        draggedIndex = null;
        dragOverIndex = null;
        dragOverTrash = false;
    }
</script>

<svelte:head>
    <title>Emote App - Edit {channel} Favorites</title>
</svelte:head>

<main>
    <nav>
        <a href="/">Channels</a>
        <span class="separator">›</span>
        <a href="/channel/{channel}">{channel}</a>
        <span class="separator">›</span>
        <span>Edit</span>
    </nav>

    <h1>Edit {channel} Favorites</h1>

    {#if loading}
        <Spinner />
    {:else if error}
        <div class="error">
            <p>Error: {error}</p>
        </div>
    {:else}
        <div class="instructions">
            <p>Drag and drop to reorder your favorite emotes. Drag to the trash can below to delete from favorites.</p>
        </div>

        <div class="emotes-grid">
            {#each favoriteEmotes as emote, index (emote.uniqueKey)}
                <EmoteCard 
                    {emote} 
                    {index}
                    mode="edit" 
                    draggable={true}
                    isDragging={draggedIndex === index}
                    isDragOver={dragOverIndex === index}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onDragEnd={handleDragEnd}
                />
            {:else}
                <p>
                    No favorite emotes yet. <a href="/channel/{channel}/add" class="button">Add some!</a>
                </p>
            {/each}
        </div>

        <!-- Trash Can Drop Zone -->
        <div 
            class="trash-zone"
            class:drag-over={dragOverTrash}
            ondragover={handleTrashDragOver}
            ondragleave={handleTrashDragLeave}
            ondrop={handleTrashDrop}
            role="button"
            tabindex="0"
            aria-label="Drop zone to delete emotes"
        >
            <div class="trash-can">
                🗑️
            </div>
            <p>Drop here to delete</p>
        </div>
    {/if}
</main>

<style>
    .instructions {
        margin: 1rem 0;
        padding: 1rem;
        background: #f8f9fa;
        border-radius: 8px;
        border: 1px solid #e9ecef;
    }

    .instructions p {
        margin: 0;
        color: #666;
        font-size: 0.9rem;
    }

    .emotes-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        gap: 1rem;
        margin: 2rem 0;
    }



    .trash-zone {
        margin: 2rem auto;
        padding: 2rem;
        border: 3px dashed #ccc;
        border-radius: 12px;
        background: #f8f9fa;
        text-align: center;
        max-width: 300px;
        transition: all 0.3s ease;
    }

    .trash-zone.drag-over {
        border-color: #dc3545;
        background: #f8d7da;
        transform: scale(1.05);
        box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
    }

    .trash-can {
        font-size: 3rem;
        margin-bottom: 0.5rem;
        transition: transform 0.2s ease;
    }

    .trash-zone.drag-over .trash-can {
        transform: scale(1.2);
    }

    .trash-zone p {
        margin: 0;
        color: #666;
        font-weight: 500;
    }

    .trash-zone.drag-over p {
        color: #721c24;
        font-weight: bold;
    }


    @media (max-width: 600px) {
        .emotes-grid {
            grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
        }

        .instructions {
            font-size: 0.8rem;
        }
    }
</style>
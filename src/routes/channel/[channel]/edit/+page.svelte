<script lang="ts">
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";
    import { loadAllEmotes, getEmoteOrPlaceholder, type Emote } from "$lib/emote-api";
    import { twitchApiKey, getFavoriteEmotesStore } from "$lib/stores";
    import Spinner from "$lib/components/Spinner.svelte";
    import EmoteCard from "$lib/components/EmoteCard.svelte";
    import Draggable from "$lib/components/Draggable.svelte";
    import { base } from "$app/paths";
    import "drag-drop-touch";

    let allEmotes: Map<string, Emote> = $state(new Map());
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
                goto(`${base}/setup`);
                return;
            }

            // Always load emotes if we have favorites to display them properly
            if ($favoriteEmotesStore.length > 0) {
                allEmotes = await loadAllEmotes($twitchApiKey, channel);
            }
        } catch (err) {
            console.error("Error loading emotes:", err);
            error = err instanceof Error ? err.message : "Failed to load emotes";
        } finally {
            loading = false;
        }
    }

    function removeFromFavorites(emoteName: string) {
        $favoriteEmotesStore = $favoriteEmotesStore.filter((name) => name !== emoteName);
    }

    function removeFromFavoritesByIndex(index: number) {
        const emoteName = $favoriteEmotesStore[index];
        if (emoteName) {
            removeFromFavorites(emoteName);
        }
    }

    // Drag and drop handlers
    function handleDragStart(event: DragEvent, emoteName: string, index?: number) {
        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/html", "");
        }
        draggedIndex = index ?? null;
    }

    function handleDragOver(event: DragEvent, emoteName: string, index?: number) {
        event.preventDefault();
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = "move";
        }

        const newDragOverIndex = index ?? null;

        // Live update: reorder items while dragging
        if (
            draggedIndex !== null &&
            newDragOverIndex !== null &&
            draggedIndex !== newDragOverIndex
        ) {
            // Create copy of the names array
            const newFavoriteNames = [...$favoriteEmotesStore];

            // Remove the dragged item
            const draggedName = newFavoriteNames.splice(draggedIndex, 1)[0];

            // Insert at new position
            newFavoriteNames.splice(newDragOverIndex, 0, draggedName);

            // Update state for live preview
            $favoriteEmotesStore = newFavoriteNames;

            // Update the dragged index to reflect the new position
            draggedIndex = newDragOverIndex;
        }

        dragOverIndex = newDragOverIndex;
    }

    function handleDragLeave() {
        dragOverIndex = null;
    }

    function handleDrop(event: DragEvent, emoteName: string, dropIndex?: number) {
        event.preventDefault();

        // Reset drag state (reordering already happened in handleDragOver)
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
    <title>Twitch Emote and Copypasta App - Edit {channel} Favorites</title>
</svelte:head>

{#if loading}
    <Spinner />
{:else if error}
    <div class="error">
        <p>Error: {error}</p>
    </div>
{:else}
    <div class="emotes-grid">
        {#each $favoriteEmotesStore as emoteName, index (emoteName)}
            {@const emote = getEmoteOrPlaceholder(allEmotes, emoteName)}
            <Draggable
                data={emoteName}
                {index}
                enabled={true}
                isDragging={draggedIndex === index}
                isDragOver={dragOverIndex === index}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                class="draggable-emote"
            >
                <EmoteCard {emote} mode="edit" />
            </Draggable>
        {:else}
            <p>
                No favorite emotes yet. <a href="{base}/channel/{channel}/add" class="button"
                    >Add some!</a
                >
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
        <div class="trash-can">🗑️</div>
    </div>
{/if}

<style>
    .emotes-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(50px, 1fr));
        gap: 0.125rem;
        margin: 1rem 0;
    }

    .trash-zone {
        margin: 2rem auto;
        padding: 2rem;
        border: 3px dashed var(--border-color);
        border-radius: 12px;
        background: var(--bg-secondary);
        text-align: center;
        max-width: 300px;
        transition: all 0.3s ease;
    }

    .trash-zone.drag-over {
        border-color: #dc3545;
        background: rgba(220, 53, 69, 0.2);
        transform: scale(1.05);
        box-shadow: 0 4px 12px rgba(220, 53, 69, 0.4);
    }

    .trash-can {
        font-size: 3rem;
        margin-bottom: 0.5rem;
        transition: transform 0.2s ease;
    }

    .trash-zone.drag-over .trash-can {
        transform: scale(1.2);
    }

    :global(.draggable-emote) {
        border-radius: 8px;
    }

    :global(.draggable-emote.dragging) {
        border: 2px solid var(--accent-primary);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    :global(.draggable-emote.drag-over) {
        border: 2px solid var(--accent-primary);
        background: rgba(145, 70, 255, 0.15);
    }

    @media (max-width: 600px) {
        .emotes-grid {
            grid-template-columns: repeat(auto-fill, minmax(45px, 1fr));
            gap: 0.0625rem;
        }
    }
</style>

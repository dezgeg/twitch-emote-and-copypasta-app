<script lang="ts">
    interface Props<T> {
        // The array of items to render
        list: T[];

        // Container class
        class?: string;

        // Grid layout settings
        gridClass?: string;

        // Optional callbacks
        onReorder?: (newList: T[]) => void;
        onRemove?: (item: T, index: number) => void;

        // Trash zone support
        showTrash?: boolean;
        onTrashDrop?: (item: T, index: number) => void;

        // Snippet for rendering each item
        renderItem: any;

        // Optional snippet for empty state
        renderEmpty?: any;
    }

    let {
        list = $bindable(),
        class: className = "",
        gridClass = "drag-drop-grid",
        onReorder,
        onRemove,
        showTrash = false,
        onTrashDrop,
        renderItem,
        renderEmpty,
    }: Props<any> = $props();

    let draggedIndex = $state<number | null>(null);
    let dragOverIndex = $state<number | null>(null);
    let dragOverTrash = $state(false);

    function handleDragStart(event: DragEvent, item: any, index?: number) {
        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/html", "");
        }
        draggedIndex = index ?? null;
    }

    function handleDragOver(event: DragEvent, item: any, index?: number) {
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
            // Create copy of the array
            const newList = [...list];

            // Remove the dragged item
            const draggedItem = newList.splice(draggedIndex, 1)[0];

            // Insert at new position
            newList.splice(newDragOverIndex, 0, draggedItem);

            // Update the list
            list = newList;
            if (onReorder) {
                onReorder(newList);
            }

            // Update the dragged index to reflect the new position
            draggedIndex = newDragOverIndex;
        }

        dragOverIndex = newDragOverIndex;
    }

    function handleDragLeave() {
        dragOverIndex = null;
    }

    function handleDrop(event: DragEvent, item: any, dropIndex?: number) {
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

    // Trash zone handlers
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
            const item = list[draggedIndex];

            if (onTrashDrop) {
                onTrashDrop(item, draggedIndex);
            } else if (onRemove) {
                onRemove(item, draggedIndex);
            } else {
                // Default behavior: remove from list
                list = list.filter((_, index) => index !== draggedIndex);
            }
        }

        // Reset drag state
        draggedIndex = null;
        dragOverIndex = null;
        dragOverTrash = false;
    }
</script>

<div class={className}>
    <div class={gridClass}>
        {#each list as item, index (item)}
            <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
            <div
                class="draggable-item"
                class:dragging={draggedIndex === index}
                class:drag-over={dragOverIndex === index}
                draggable={true}
                ondragstart={(event) => handleDragStart(event, item, index)}
                ondragover={(event) => handleDragOver(event, item, index)}
                ondragleave={handleDragLeave}
                ondrop={(event) => handleDrop(event, item, index)}
                ondragend={handleDragEnd}
                role="button"
                tabindex="0"
            >
                {@render renderItem(item, index)}
            </div>
        {:else}
            {#if renderEmpty}
                {@render renderEmpty()}
            {:else}
                <p>No items yet.</p>
            {/if}
        {/each}
    </div>

    {#if showTrash}
        <!-- Trash Can Drop Zone -->
        <div
            class="trash-zone"
            class:drag-over={dragOverTrash}
            ondragover={handleTrashDragOver}
            ondragleave={handleTrashDragLeave}
            ondrop={handleTrashDrop}
            role="button"
            tabindex="0"
        >
            <div class="trash-can">🗑️</div>
            <p>Drop here to remove</p>
        </div>
    {/if}
</div>

<style>
    .drag-drop-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(50px, 1fr));
        gap: 0.125rem;
        margin-bottom: 2rem;
    }

    .draggable-item {
        border-radius: 8px;
        cursor: grab;
    }

    .draggable-item:active {
        cursor: grabbing;
    }

    .draggable-item.dragging {
        border: 2px solid var(--accent-primary);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        opacity: 0.5;
    }

    .draggable-item.drag-over {
        border: 2px solid var(--accent-primary);
        background: rgba(145, 70, 255, 0.15);
    }

    .trash-zone {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 2rem;
        margin-top: 2rem;
        border: 2px dashed var(--border-color);
        border-radius: 12px;
        background: var(--bg-secondary);
        text-align: center;
        transition: all 0.2s ease;
        min-height: 120px;
    }

    .trash-zone.drag-over {
        border-color: #dc3545;
        background: rgba(220, 53, 69, 0.1);
        transform: scale(1.02);
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

    @media (max-width: 600px) {
        .drag-drop-grid {
            grid-template-columns: repeat(auto-fill, minmax(45px, 1fr));
            gap: 0.0625rem;
        }
    }
</style>

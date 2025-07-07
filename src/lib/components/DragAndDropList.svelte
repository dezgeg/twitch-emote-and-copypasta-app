<script lang="ts">
    import { onMount } from "svelte";
    import type { Writable } from "svelte/store";
    import type TrashDropZone from "./TrashDropZone.svelte";
    import { enableDragDropTouch } from "drag-drop-touch";

    interface Props<T> {
        // The store containing the array of items to render
        store: Writable<T[]>;

        // Container class
        class?: string;

        // Grid layout settings
        gridClass?: string;

        // Optional trash drop zone reference
        trashDropZone?: TrashDropZone;

        // Snippet for rendering each item
        renderItem: any;

        // Optional snippet for empty state
        renderEmpty?: any;
    }

    let {
        store,
        class: className = "",
        gridClass = "drag-drop-grid",
        trashDropZone,
        renderItem,
        renderEmpty,
    }: Props<any> = $props();

    let draggedIndex = $state<number | null>(null);
    let dropIndicatorIndex = $state<number | null>(null); // Index where drop line should appear
    let containerElement = $state<HTMLElement>();

    function handleDragStart(event: DragEvent, index: number) {
        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/html", "");
        }
        draggedIndex = index;

        // Register this list as the active one for trash drops
        if (trashDropZone) {
            trashDropZone.registerDragAndDropList(handleTrashDrop);
        }
    }

    function handleDragOver(event: DragEvent, index: number) {
        event.preventDefault();
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = "move";
        }

        // Update drop indicator - show where the item would be inserted
        if (draggedIndex !== null && draggedIndex !== index) {
            // When hovering over an item, we want to insert the dragged item in place of it
            // So show the indicator before the hovered item
            dropIndicatorIndex = index;
        } else {
            dropIndicatorIndex = null;
        }
    }

    function handleDragLeave() {
        dropIndicatorIndex = null;
    }

    function handleDrop(event: DragEvent, dropIndex: number) {
        event.preventDefault();

        // Perform the actual reordering on drop
        if (
            draggedIndex !== null &&
            dropIndicatorIndex !== null &&
            draggedIndex !== dropIndicatorIndex
        ) {
            store.update((currentList) => {
                const draggedItem = currentList.splice(draggedIndex!, 1)[0];

                // Adjust insertion index if we removed an item from before the insertion point
                const insertIndex =
                    dropIndicatorIndex! > draggedIndex!
                        ? dropIndicatorIndex! - 1
                        : dropIndicatorIndex!;
                currentList.splice(insertIndex, 0, draggedItem);
                return currentList;
            });
        }

        // Reset drag state
        draggedIndex = null;
        dropIndicatorIndex = null;
    }

    function handleDragEnd(event: DragEvent) {
        // Unregister from trash zone
        if (trashDropZone) {
            trashDropZone.unregisterDragAndDropList();
        }

        draggedIndex = null;
        dropIndicatorIndex = null;
    }

    function handleTrashDrop() {
        if (draggedIndex !== null) {
            // Remove item from list
            store.update((currentList) => {
                currentList.splice(draggedIndex!, 1);
                return currentList;
            });

            // Reset drag state
            draggedIndex = null;
            dropIndicatorIndex = null;
        }
    }

    onMount(() => {
        // Enable drag-drop-touch for mobile support, scoped to this container only
        if (containerElement) {
            enableDragDropTouch(containerElement, containerElement);
        }
    });
</script>

<div class={className} bind:this={containerElement}>
    <div class={gridClass} class:has-drop-indicator={dropIndicatorIndex !== null}>
        {#each $store as item, index (item)}
            <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
            <div
                class="draggable-item"
                class:dragging={draggedIndex === index}
                class:drop-target-before={dropIndicatorIndex === index}
                class:drop-target-after={dropIndicatorIndex === index + 1}
                draggable={true}
                ondragstart={(event) => handleDragStart(event, index)}
                ondragover={(event) => handleDragOver(event, index)}
                ondragleave={handleDragLeave}
                ondrop={(event) => handleDrop(event, index)}
                ondragend={(event) => handleDragEnd(event)}
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
</div>

<style>
    .drag-drop-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(50px, 1fr));
        gap: 0.125rem;
    }

    .draggable-item {
        border-radius: 8px;
        cursor: grab;
        position: relative;
    }

    .draggable-item:active {
        cursor: grabbing;
    }

    .draggable-item.dragging {
        box-shadow:
            inset 0 0 0 2px var(--accent-primary),
            0 4px 12px rgba(0, 0, 0, 0.3);
        opacity: 0.5;
    }

    /* Default column layout - horizontal lines above/below */
    .draggable-item.drop-target-before::before,
    .draggable-item.drop-target-after::after {
        content: "";
        position: absolute;
        left: 0;
        right: 0;
        height: 3px;
        background: var(--accent-primary);
        border-radius: 2px;
        box-shadow: 0 0 8px rgba(145, 70, 255, 0.6);
        animation: pulse 1s ease-in-out infinite alternate;
        z-index: 10;
    }

    .draggable-item.drop-target-before::before {
        top: -2px;
    }

    .draggable-item.drop-target-after::after {
        bottom: -2px;
    }

    /* Grid layout - vertical lines on left/right sides */
    .drag-drop-grid .draggable-item.drop-target-before::before,
    .drag-drop-grid .draggable-item.drop-target-after::after {
        top: 0;
        bottom: 0;
        width: 3px;
        height: auto;
        left: auto;
        right: auto;
    }

    .drag-drop-grid .draggable-item.drop-target-before::before {
        left: -2px;
        top: 0;
    }

    .drag-drop-grid .draggable-item.drop-target-after::after {
        right: -2px;
        bottom: auto;
        top: 0;
    }

    /* For grid layouts, make sure the container has relative positioning */
    .drag-drop-grid {
        position: relative;
    }

    @keyframes pulse {
        from {
            opacity: 0.7;
        }
        to {
            opacity: 1;
        }
    }

    @media (max-width: 768px) {
        .drag-drop-grid {
            grid-template-columns: repeat(auto-fill, minmax(45px, 1fr));
            gap: 0.0625rem;
        }
    }
</style>

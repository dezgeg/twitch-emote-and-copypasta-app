<script lang="ts">
    let dragOverTrash = $state(false);
    let showTrash = $state(false);
    let onTrashDrop: (() => void) | null = $state(null);

    export function registerDragAndDropList(callback: () => void) {
        onTrashDrop = callback;
        showTrash = true;
    }

    export function unregisterDragAndDropList() {
        onTrashDrop = null;
        showTrash = false;
    }

    export function handleTrashDragOver(event: DragEvent) {
        event.preventDefault();
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = "move";
        }
        dragOverTrash = true;
    }

    export function handleTrashDragLeave(event: DragEvent) {
        dragOverTrash = false;
    }

    function handleTrashDrop(event: DragEvent) {
        event.preventDefault();

        if (onTrashDrop) {
            onTrashDrop();
        }

        dragOverTrash = false;
    }
</script>

{#if showTrash}
    <!-- Floating Trash Can Drop Zone -->
    <div
        class="trash-zone"
        class:drag-over={dragOverTrash}
        ondragover={handleTrashDragOver}
        ondragleave={(event) => handleTrashDragLeave(event)}
        ondrop={handleTrashDrop}
        role="button"
        tabindex="0"
    >
        <div class="trash-can">🗑️</div>
        <p>Drop here to remove</p>
    </div>
{/if}

<style>
    .trash-zone {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 1cm;
        padding: 0 1rem;
        border: none;
        border-bottom: 2px dashed var(--border-color);
        background: #2f2f2f;
        font-family: monospace;
        font-size: 0.875rem;
        transition: all 0.2s ease;
        gap: 0.5rem;
    }

    .trash-zone.drag-over {
        border-bottom-color: #9146ff;
        background: #9146ff;
        box-shadow: 0 4px 12px rgba(145, 70, 255, 0.4);
    }

    .trash-can {
        font-size: 1.5rem;
        margin: 0;
        transition: transform 0.2s ease;
    }

    .trash-zone p {
        margin: 0;
        font-size: 0.875rem;
        color: #ffffff;
        font-weight: normal;
    }

    .trash-zone.drag-over .trash-can {
        transform: scale(1.2);
    }

    @media (max-width: 600px) {
        .trash-zone {
            height: auto;
            min-height: 1cm;
            flex-wrap: wrap;
        }
    }
</style>

<script lang="ts">
    let dragOverTrash = $state(false);
    let onTrashDrop: (() => void) | null = $state(null);

    export function registerDragAndDropList(callback: () => void) {
        onTrashDrop = callback;
    }

    export function unregisterDragAndDropList() {
        onTrashDrop = null;
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

<!-- Trash Can Drop Zone -->
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

<style>
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
</style>

<script lang="ts">
    interface Props {
        // Data payload for the draggable item
        data?: any;
        index?: number;

        // Drag state
        isDragging?: boolean;
        isDragOver?: boolean;

        // Enable/disable dragging
        enabled?: boolean;

        // Event handlers
        onDragStart?: (event: DragEvent, data: any, index?: number) => void;
        onDragOver?: (event: DragEvent, data: any, index?: number) => void;
        onDragLeave?: () => void;
        onDrop?: (event: DragEvent, data: any, index?: number) => void;
        onDragEnd?: () => void;

        // CSS classes
        class?: string;
        dragClass?: string;
        dragOverClass?: string;

        // Children
        children?: any;
    }

    let {
        data,
        index,
        isDragging = false,
        isDragOver = false,
        enabled = true,
        onDragStart,
        onDragOver,
        onDragLeave,
        onDrop,
        onDragEnd,
        class: className = "",
        dragClass = "",
        dragOverClass = "",
        children,
    }: Props = $props();

    function handleDragStart(event: DragEvent) {
        if (onDragStart) {
            onDragStart(event, data, index);
        }
    }

    function handleDragOver(event: DragEvent) {
        if (onDragOver) {
            onDragOver(event, data, index);
        }
    }

    function handleDrop(event: DragEvent) {
        if (onDrop) {
            onDrop(event, data, index);
        }
    }
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
    class={className}
    class:dragging={isDragging}
    class:drag-over={isDragOver}
    class:draggable={enabled}
    draggable={enabled}
    ondragstart={enabled ? handleDragStart : undefined}
    ondragover={enabled ? handleDragOver : undefined}
    ondragleave={enabled ? onDragLeave : undefined}
    ondrop={enabled ? handleDrop : undefined}
    ondragend={enabled ? onDragEnd : undefined}
    role={enabled ? "button" : undefined}
    tabindex={enabled ? 0 : undefined}
>
    {#if isDragging && dragClass}
        <div class={dragClass}>
            {@render children()}
        </div>
    {:else if isDragOver && dragOverClass}
        <div class={dragOverClass}>
            {@render children()}
        </div>
    {:else}
        {@render children()}
    {/if}
</div>

<style>
    .draggable {
        cursor: grab;
    }

    .draggable:active {
        cursor: grabbing;
    }

    .dragging {
        opacity: 0.5;
        transform: rotate(2deg);
    }

    .drag-over {
        transform: scale(1.02);
    }
</style>

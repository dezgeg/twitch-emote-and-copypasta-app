<script lang="ts">
    import type { Emote } from "$lib/emote-api";

    interface Props {
        // Core emote data
        emote: Emote;
        
        // Display mode
        mode: 'view' | 'add' | 'edit';
        
        // State flags
        isFavorited?: boolean;
        isDragging?: boolean;
        isDragOver?: boolean;
        
        // Event handlers
        onClick?: (emote: Emote) => void;
        
        // Drag and drop support
        draggable?: boolean;
        onDragStart?: (event: DragEvent, emote: Emote, index?: number) => void;
        onDragOver?: (event: DragEvent, emote: Emote, index?: number) => void;
        onDragLeave?: () => void;
        onDrop?: (event: DragEvent, emote: Emote, index?: number) => void;
        onDragEnd?: () => void;
        
        // Optional index for drag operations
        index?: number;
    }

    let {
        emote,
        mode,
        isFavorited = false,
        isDragging = false,
        isDragOver = false,
        onClick,
        draggable = false,
        onDragStart,
        onDragOver,
        onDragLeave,
        onDrop,
        onDragEnd,
        index
    }: Props = $props();

    // Determine the wrapper element and attributes
    let isClickable = $derived(mode === 'view' || mode === 'add');
    let isDraggableMode = $derived(mode === 'edit' && draggable);

    function handleClick() {
        if (onClick) {
            onClick(emote);
        }
    }

    function handleDragStart(event: DragEvent) {
        if (onDragStart) {
            onDragStart(event, emote, index);
        }
    }

    function handleDragOver(event: DragEvent) {
        if (onDragOver) {
            onDragOver(event, emote, index);
        }
    }

    function handleDrop(event: DragEvent) {
        if (onDrop) {
            onDrop(event, emote, index);
        }
    }

</script>

<div
    class="emote-card emote-card--{mode}"
    class:emote-card--favorited={isFavorited}
    class:emote-card--dragging={isDragging}
    class:emote-card--drag-over={isDragOver}
    draggable={isDraggableMode}
    onclick={isClickable ? handleClick : undefined}
    ondragstart={isDraggableMode ? handleDragStart : undefined}
    ondragover={isDraggableMode ? handleDragOver : undefined}
    ondragleave={isDraggableMode ? onDragLeave : undefined}
    ondrop={isDraggableMode ? handleDrop : undefined}
    ondragend={isDraggableMode ? onDragEnd : undefined}
    role={isClickable || isDraggableMode ? 'button' : undefined}
    tabindex={isClickable || isDraggableMode ? 0 : undefined}
>
    {#if emote.url}
        <img src={emote.url} alt={emote.name} class="emote-image" />
    {:else}
        <div class="emote-placeholder">{emote.name[0]?.toUpperCase()}</div>
    {/if}
    {#if mode === 'add'}
        <span class="emote-name">{emote.name}</span>
        <span class="emote-type emote-type--{emote.type}">
            {emote.type.toUpperCase()}
        </span>
    {/if}
</div>

<style>
    .emote-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 0.25rem;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        background: var(--bg-secondary);
        color: var(--text-primary);
        text-align: center;
        transition: all 0.2s;
        position: relative;
        user-select: none;
    }

    .emote-card--add {
        padding: 0.5rem;
    }


    /* Mode-specific styles */
    .emote-card--view {
        cursor: pointer;
    }

    .emote-card--add {
        cursor: pointer;
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    }

    .emote-card--edit {
        cursor: grab;
        border-width: 2px;
    }

    .emote-card--edit:active {
        cursor: grabbing;
    }

    /* Interactive states */
    .emote-card--view:hover,
    .emote-card--add:hover {
        background: var(--bg-tertiary);
        border-color: var(--accent-primary);
    }

    .emote-card--add:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
    }

    /* Favorited state */
    .emote-card--favorited {
        background: rgba(145, 70, 255, 0.15);
        border-color: var(--accent-primary);
    }

    .emote-card--favorited:hover {
        background: rgba(145, 70, 255, 0.25);
        border-color: var(--accent-hover);
    }

    /* Drag states */
    .emote-card--dragging {
        opacity: 0.5;
        transform: rotate(2deg);
        border-color: var(--accent-primary);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .emote-card--drag-over {
        border-color: var(--accent-primary);
        background: rgba(145, 70, 255, 0.15);
        transform: scale(1.02);
    }

    /* Image and placeholder */
    .emote-image,
    .emote-placeholder {
        width: 40px;
        height: 40px;
        margin: 0;
    }

    .emote-card--add .emote-image,
    .emote-card--add .emote-placeholder {
        margin-bottom: 0.5rem;
    }

    .emote-placeholder {
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--bg-tertiary);
        border: 2px dashed var(--border-color);
        border-radius: 8px;
        font-size: 1.5rem;
        font-weight: bold;
        color: var(--text-secondary);
    }


    /* Emote name */
    .emote-name {
        font-size: 0.875rem;
        font-weight: bold;
        word-break: break-word;
    }

    .emote-card--add .emote-name,
    .emote-card--edit .emote-name {
        margin-bottom: 0.25rem;
    }


    /* Emote type badges */
    .emote-type {
        font-size: 0.75rem;
        padding: 0.2rem 0.4rem;
        border-radius: 12px;
        font-weight: bold;
        text-transform: uppercase;
    }

    .emote-type--twitch {
        background: #9146ff;
        color: white;
    }

    .emote-type--7tv {
        background: #00f5ff;
        color: black;
    }

    .emote-type--bttv {
        background: #d50000;
        color: white;
    }

    .emote-type--ffz {
        background: #755000;
        color: white;
    }
</style>
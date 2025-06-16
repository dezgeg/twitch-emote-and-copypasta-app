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
        onToggleFavorite?: (emote: Emote) => void;
        
        // Drag and drop support
        draggable?: boolean;
        onDragStart?: (event: DragEvent, emote: Emote, index?: number) => void;
        onDragOver?: (event: DragEvent, emote: Emote, index?: number) => void;
        onDragLeave?: () => void;
        onDrop?: (event: DragEvent, emote: Emote, index?: number) => void;
        onDragEnd?: () => void;
        
        // Optional index for drag operations
        index?: number;
        
        // Size variant
        size?: 'small' | 'medium' | 'large';
    }

    let {
        emote,
        mode,
        isFavorited = false,
        isDragging = false,
        isDragOver = false,
        onClick,
        onToggleFavorite,
        draggable = false,
        onDragStart,
        onDragOver,
        onDragLeave,
        onDrop,
        onDragEnd,
        index,
        size = 'medium'
    }: Props = $props();

    // Determine the wrapper element and attributes
    let isClickable = $derived(mode === 'view' || mode === 'add');
    let isDraggableMode = $derived(mode === 'edit' && draggable);

    function handleClick() {
        if (mode === 'view' && onClick) {
            onClick(emote);
        } else if (mode === 'add' && onToggleFavorite) {
            onToggleFavorite(emote);
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

    function getEmoteTypeDisplay(type: string): string {
        switch (type) {
            case 'bttv': return 'BTTV';
            case 'ffz': return 'FFZ';
            default: return type.toUpperCase();
        }
    }
</script>

{#if isClickable}
    <button
        class="emote-card emote-card--{mode} emote-card--{size}"
        class:emote-card--favorited={isFavorited}
        onclick={handleClick}
    >
        {#if emote.url}
            <img src={emote.url} alt={emote.name} class="emote-image" />
        {:else}
            <div class="emote-placeholder">{emote.name[0]?.toUpperCase()}</div>
        {/if}
        <span class="emote-name">{emote.name}</span>
        {#if mode === 'add'}
            <span class="emote-type emote-type--{emote.type === '7tv' ? 'seventv' : emote.type}">
                {getEmoteTypeDisplay(emote.type)}
            </span>
        {/if}
    </button>
{:else if isDraggableMode}
    <div
        class="emote-card emote-card--{mode} emote-card--{size}"
        class:emote-card--dragging={isDragging}
        class:emote-card--drag-over={isDragOver}
        draggable="true"
        ondragstart={handleDragStart}
        ondragover={handleDragOver}
        ondragleave={onDragLeave}
        ondrop={handleDrop}
        ondragend={onDragEnd}
        role="button"
        tabindex="0"
    >
        {#if emote.url}
            <img src={emote.url} alt={emote.name} class="emote-image" />
        {:else}
            <div class="emote-placeholder">{emote.name[0]?.toUpperCase()}</div>
        {/if}
        <span class="emote-name">{emote.name}</span>
        <span class="emote-type emote-type--{emote.type === '7tv' ? 'seventv' : emote.type}">
            {getEmoteTypeDisplay(emote.type)}
        </span>
    </div>
{:else}
    <!-- Fallback for non-interactive display -->
    <div class="emote-card emote-card--{mode} emote-card--{size}">
        {#if emote.url}
            <img src={emote.url} alt={emote.name} class="emote-image" />
        {:else}
            <div class="emote-placeholder">{emote.name[0]?.toUpperCase()}</div>
        {/if}
        <span class="emote-name">{emote.name}</span>
    </div>
{/if}

<style>
    .emote-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 1rem;
        border: 1px solid #ccc;
        border-radius: 8px;
        background: white;
        text-align: center;
        transition: all 0.2s;
        position: relative;
        user-select: none;
    }

    /* Size variants */
    .emote-card--small {
        padding: 0.75rem;
    }

    .emote-card--medium {
        padding: 1rem;
    }

    .emote-card--large {
        padding: 1.25rem;
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
        background: #f5f5f5;
        border-color: #999;
    }

    .emote-card--add:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }

    /* Favorited state */
    .emote-card--favorited {
        background: #e8f4fd;
        border-color: #4a90e2;
    }

    .emote-card--favorited:hover {
        background: #d1e7fc;
        border-color: #357abd;
    }

    /* Drag states */
    .emote-card--dragging {
        opacity: 0.5;
        transform: rotate(2deg);
        border-color: #4a90e2;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .emote-card--drag-over {
        border-color: #4a90e2;
        background: #e8f4fd;
        transform: scale(1.02);
    }

    /* Image and placeholder */
    .emote-image,
    .emote-placeholder {
        width: 56px;
        height: 56px;
        margin-bottom: 0.5rem;
    }

    .emote-card--small .emote-image,
    .emote-card--small .emote-placeholder {
        width: 40px;
        height: 40px;
    }

    .emote-card--large .emote-image,
    .emote-card--large .emote-placeholder {
        width: 72px;
        height: 72px;
    }

    .emote-placeholder {
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f0f0f0;
        border: 2px dashed #ccc;
        border-radius: 8px;
        font-size: 1.5rem;
        font-weight: bold;
        color: #666;
    }

    .emote-card--add .emote-image,
    .emote-card--add .emote-placeholder,
    .emote-card--edit .emote-image,
    .emote-card--edit .emote-placeholder {
        margin-bottom: 0.5rem;
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

    .emote-card--small .emote-name {
        font-size: 0.75rem;
    }

    .emote-card--large .emote-name {
        font-size: 1rem;
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

    .emote-type--seventv {
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
<script lang="ts">
    import type { Emote } from "$lib/emote-api";
    import "$lib/styles/card.css";

    interface Props {
        // Core emote data
        emote: Emote;

        // Display mode
        mode: "view" | "add" | "edit";

        // State flags
        isFavorited?: boolean;

        // Event handlers
        onClick?: (emote: Emote) => void;
    }

    let { emote, mode, isFavorited = false, onClick }: Props = $props();

    // Determine the wrapper element and attributes
    let isClickable = $derived(mode === "view" || mode === "add");

    // Add zero-width spaces before capital letters for better word wrapping
    function addZeroWidthSpaces(text: string): string {
        return text.replace(/([a-z])([A-Z])/g, "$1\u200B$2");
    }

    function handleClick() {
        if (onClick) {
            onClick(emote);
        }
    }
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
    class="card emote-card emote-card--{mode}"
    class:card--clickable={isClickable}
    class:card--favorited={isFavorited}
    onclick={isClickable ? handleClick : undefined}
    role={isClickable ? "button" : undefined}
    tabindex={isClickable ? 0 : undefined}
>
    {#if emote.url}
        <img src={emote.url} alt={emote.name} class="emote-image" />
    {:else}
        <div class="emote-placeholder">{emote.name[0]?.toUpperCase()}</div>
    {/if}
    {#if mode === "add"}
        <span class="emote-name">{addZeroWidthSpaces(emote.name)}</span>
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
        text-align: center;
        user-select: none;
    }

    .emote-card--add {
        padding: 0.5rem;
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    }

    .emote-card--edit {
        border-width: 2px;
    }

    .emote-card--add:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
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
        font-size: 0.75rem;
        font-weight: bold;
        word-break: break-word;
    }

    .emote-card--add .emote-name,
    .emote-card--edit .emote-name {
        margin-bottom: 0.25rem;
    }

    /* Emote type badges */
    .emote-type {
        font-size: 0.625rem;
        padding: 0.15rem 0.3rem;
        border-radius: 8px;
        font-weight: bold;
        text-transform: uppercase;
    }

    .emote-type--twitch {
        background: var(--accent-primary);
        color: white;
    }

    .emote-type--7tv {
        background: var(--emote-7tv);
        color: black;
    }

    .emote-type--bttv {
        background: var(--emote-bttv);
        color: white;
    }

    .emote-type--ffz {
        background: var(--emote-ffz);
        color: white;
    }
</style>

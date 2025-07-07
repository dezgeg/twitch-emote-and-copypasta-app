<script lang="ts">
    import type { Snippet } from "svelte";

    interface Props {
        variant?: "primary" | "secondary" | "destructive" | "ghost" | "icon";
        size?: "small" | "medium" | "large";
        type?: "button" | "submit" | "reset";
        disabled?: boolean;
        class?: string;
        onclick?: (event: MouseEvent) => void;
        children: Snippet;
        [key: string]: any; // Allow additional HTML attributes
    }

    let {
        variant = "secondary",
        size = "medium",
        type = "button",
        disabled = false,
        class: className = "",
        onclick,
        children,
        ...restProps
    }: Props = $props();

    let buttonClass = $derived(`btn btn--${variant} btn--${size} ${className}`.trim());
</script>

<button {type} {disabled} class={buttonClass} {onclick} {...restProps}>
    {@render children()}
</button>

<style>
    .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        text-decoration: none;
        font-weight: 500;
        transition: all 0.2s ease;
        box-sizing: border-box;
        white-space: nowrap;
    }

    .btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none !important;
    }

    /* Sizes */
    .btn--small {
        padding: 0.375rem 0.75rem;
        font-size: 0.875rem;
        min-height: 32px;
    }

    .btn--medium {
        padding: 0.5rem 1rem;
        font-size: 1rem;
        min-height: 36px;
    }

    .btn--large {
        padding: 1rem 2rem;
        font-size: 1.1rem;
        font-weight: bold;
        min-height: 48px;
        border-radius: 8px;
    }

    /* Variants */
    .btn--primary {
        background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-hover) 100%);
        color: white;
        box-shadow: 0 4px 12px rgba(145, 70, 255, 0.3);
    }

    .btn--primary:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(145, 70, 255, 0.4);
        background: linear-gradient(135deg, var(--accent-hover) 0%, var(--accent-primary) 100%);
    }

    .btn--secondary {
        background: var(--bg-secondary);
        color: var(--text-primary);
        border: 1px solid var(--border-color);
    }

    .btn--secondary:hover:not(:disabled) {
        background: var(--bg-tertiary);
    }

    .btn--destructive {
        background: linear-gradient(
            135deg,
            var(--destructive-primary) 0%,
            var(--destructive-hover) 100%
        );
        color: white;
        box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
    }

    .btn--destructive:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(220, 53, 69, 0.4);
        background: linear-gradient(
            135deg,
            var(--destructive-hover) 0%,
            var(--destructive-primary) 100%
        );
    }

    .btn--ghost {
        background: transparent;
        color: var(--accent-primary);
        border: 1px solid var(--border-color);
    }

    .btn--ghost:hover:not(:disabled) {
        background: rgba(145, 70, 255, 0.1);
        border-color: var(--accent-primary);
    }

    .btn--icon {
        background: var(--accent-primary);
        color: white;
        padding: 0.5rem;
        min-width: 36px;
        width: 36px;
        height: 36px;
        border-radius: 6px;
    }

    .btn--icon:hover:not(:disabled) {
        background: var(--accent-secondary);
    }

    .btn--icon.btn--small {
        min-width: 32px;
        width: 32px;
        height: 32px;
        padding: 0.375rem;
    }

    .btn--icon.btn--large {
        min-width: 48px;
        width: 48px;
        height: 48px;
        padding: 0.75rem;
        font-size: 20px;
    }

    /* Special styling for specific use cases */
    .btn--destructive.btn--small {
        background: var(--destructive-primary);
        box-shadow: none;
    }

    .btn--destructive.btn--small:hover:not(:disabled) {
        background: var(--destructive-hover);
        transform: none;
        box-shadow: none;
    }
</style>

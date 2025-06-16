<div class="spinner" aria-label="Loading..."></div>

<style>
    .spinner {
        width: 2rem;
        height: 2rem;
        border: 3px solid var(--bg-tertiary);
        border-top: 3px solid var(--accent-primary);
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 2rem auto;
    }

    @keyframes spin {
        0% {
            transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
        }
    }
</style>

<script>
    import { base } from '$app/paths';
    import { page } from '$app/stores';
</script>

<main>
    <slot />
</main>

<style>
    :global(html) {
        font-family: Arial, Helvetica, sans-serif;
    }

    :global(body) {
        margin: 0;
        padding: 0;
        min-height: 100vh;
        background: #f8f9fa;
    }

    main {
        max-width: 1200px;
        margin: 0 auto;
        padding: 1rem;
    }

    /* Navigation styles */
    :global(nav) {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 2rem;
        padding: 1rem 0;
        flex-wrap: wrap;
    }

    :global(nav a) {
        color: #007bff;
        text-decoration: none;
        font-weight: 500;
    }

    :global(nav a:hover) {
        text-decoration: underline;
    }

    :global(.separator) {
        color: #6c757d;
        user-select: none;
    }

    :global(.error) {
        background: #f8d7da;
        border: 1px solid #f5c6cb;
        color: #721c24;
        padding: 1rem;
        border-radius: 8px;
        margin: 1rem 0;
    }

    :global(.button) {
        display: inline-block;
        padding: 0.5rem 1rem;
        background: #007bff;
        color: white;
        text-decoration: none;
        border-radius: 4px;
        font-weight: 500;
    }

    :global(.button:hover) {
        background: #0056b3;
        text-decoration: none;
    }
</style>
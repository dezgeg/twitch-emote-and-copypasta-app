<script lang="ts">
    import { onMount } from "svelte";
    import { goto, replaceState } from "$app/navigation";
    import { base } from "$app/paths";
    import { parseOAuthCallback, validateToken } from "$lib/oauth";
    import { oauthToken } from "$lib/stores";

    let status = $state<"loading" | "success" | "error">("loading");
    let errorMessage = $state("");
    let userInfo = $state<any>(null);

    onMount(async () => {
        try {
            // Add a small delay to ensure URL fragment is available
            await new Promise((resolve) => setTimeout(resolve, 100));

            // Parse the OAuth callback from URL fragment
            const token = parseOAuthCallback();

            if (!token) {
                status = "error";
                errorMessage = `No access token received from Twitch. URL hash: ${window.location.hash}`;
                return;
            }

            // Validate the token with Twitch API
            const validation = await validateToken(token.access_token);

            if (!validation.valid) {
                status = "error";
                errorMessage = "Invalid access token received";
                return;
            }

            // Store the token
            oauthToken.set(token);
            userInfo = validation.user;
            status = "success";

            // Clear the URL fragment using SvelteKit's navigation API
            replaceState(window.location.pathname, {});

            // Redirect to main page after a short delay
            setTimeout(() => {
                goto(`${base}/`);
            }, 2000);
        } catch (error) {
            console.error("OAuth callback error:", error);
            status = "error";
            errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        }
    });
</script>

<svelte:head>
    <title>Twitch Emote App - Authentication</title>
</svelte:head>

<div class="page-padding auth-callback">
    {#if status === "loading"}
        <div class="status-container loading">
            <div class="spinner"></div>
            <h2>🔐 Authenticating with Twitch...</h2>
            <p>Please wait while we complete your authentication.</p>
        </div>
    {:else if status === "success"}
        <div class="status-container success">
            <div class="checkmark">✅</div>
            <h2>🎉 Authentication Successful!</h2>
            {#if userInfo}
                <p>Welcome, <strong>{userInfo.display_name || userInfo.login}</strong>!</p>
            {/if}
            <p>You will be redirected to the main page in a moment...</p>
            <a href="{base}/" class="manual-link">Continue to App</a>
        </div>
    {:else if status === "error"}
        <div class="status-container error">
            <div class="error-icon">❌</div>
            <h2>Authentication Failed</h2>
            <p class="error-message">{errorMessage}</p>
            <div class="error-actions">
                <a href="{base}/setup" class="button">Try Again</a>
                <a href="{base}/" class="button secondary">Go Home</a>
            </div>
        </div>
    {/if}
</div>

<style>
    .auth-callback {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 60vh;
    }

    .status-container {
        text-align: center;
        max-width: 400px;
        padding: 2rem;
        border-radius: 12px;
        border: 1px solid var(--border-color);
    }

    .status-container.loading {
        background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%);
    }

    .status-container.success {
        background: linear-gradient(135deg, #1a4d1a 0%, #2d5a2d 100%);
        border-color: #4a8f4a;
    }

    .status-container.error {
        background: linear-gradient(135deg, var(--error-bg) 0%, #5a1a1a 100%);
        border-color: var(--error-border);
    }

    .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid var(--border-color);
        border-top: 4px solid var(--accent-primary);
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 1rem;
    }

    @keyframes spin {
        0% {
            transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
        }
    }

    .checkmark,
    .error-icon {
        font-size: 3rem;
        margin-bottom: 1rem;
        display: block;
    }

    h2 {
        margin: 1rem 0;
        color: var(--text-primary);
    }

    p {
        margin: 0.5rem 0;
        color: var(--text-secondary);
    }

    .error-message {
        color: var(--error-text);
        font-weight: 500;
        margin: 1rem 0;
    }

    .manual-link {
        display: inline-block;
        margin-top: 1rem;
        padding: 0.5rem 1rem;
        background: var(--accent-primary);
        color: white;
        text-decoration: none;
        border-radius: 4px;
        transition: background-color 0.2s ease;
    }

    .manual-link:hover {
        background: var(--accent-hover);
    }

    .error-actions {
        margin-top: 1.5rem;
        display: flex;
        gap: 1rem;
        justify-content: center;
        flex-wrap: wrap;
    }

    .button {
        padding: 0.5rem 1rem;
        border-radius: 4px;
        text-decoration: none;
        font-weight: 500;
        transition: all 0.2s ease;
        border: 1px solid var(--border-color);
    }

    .button:not(.secondary) {
        background: var(--accent-primary);
        color: white;
        border-color: var(--accent-primary);
    }

    .button:not(.secondary):hover {
        background: var(--accent-hover);
        border-color: var(--accent-hover);
    }

    .button.secondary {
        background: var(--bg-secondary);
        color: var(--text-primary);
    }

    .button.secondary:hover {
        background: var(--bg-tertiary);
    }
</style>

<script lang="ts">
    import { twitchApiKey } from "$lib/stores";
    import { onMount } from "svelte";

    let deferredPrompt: any = null;
    let showInstallButton = $state(false);
    let isInstalled = $state(false);

    onMount(() => {
        // Check if already installed
        if (
            window.matchMedia("(display-mode: standalone)").matches ||
            (window.navigator as any).standalone
        ) {
            isInstalled = true;
        }

        // Listen for the beforeinstallprompt event
        window.addEventListener("beforeinstallprompt", (e) => {
            e.preventDefault();
            deferredPrompt = e;
            showInstallButton = true;
        });

        // Listen for the appinstalled event
        window.addEventListener("appinstalled", () => {
            isInstalled = true;
            showInstallButton = false;
            deferredPrompt = null;
        });
    });

    async function installApp() {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === "accepted") {
            console.log("User accepted the install prompt");
        }

        deferredPrompt = null;
        showInstallButton = false;
    }
</script>

<svelte:head>
    <title>Twitch Emote and Copypasta App - Setup</title>
</svelte:head>

<div class="page-padding setup-form">
    <label for="apiKey">Twitch API Key:</label>
    <input
        id="apiKey"
        type="text"
        bind:value={$twitchApiKey}
        placeholder="Enter your Twitch API key"
        autocomplete="off"
        class="api-key-input"
    />
    <p class="help-text">Your API key is automatically saved as you type.</p>
</div>

<!-- PWA Installation Section -->
{#if !isInstalled}
    <div class="page-padding pwa-section">
        <h3>📱 Install as App</h3>
        <p>Get the best experience by installing this app on your device!</p>

        {#if showInstallButton}
            <button class="install-button" onclick={installApp}>
                <span class="install-icon">📲</span>
                Install App
            </button>
        {:else}
            <div class="install-instructions">
                <p><strong>To install on mobile:</strong></p>
                <ul>
                    <li>
                        <strong>iOS Safari:</strong> Tap the share button and select "Add to Home Screen"
                    </li>
                    <li>
                        <strong>Android Chrome:</strong> Tap the menu (⋮) and select "Add to Home screen"
                    </li>
                </ul>
                <p><strong>To install on desktop:</strong></p>
                <ul>
                    <li>
                        <strong>Chrome/Edge:</strong> Look for the install icon in the address bar
                    </li>
                    <li>
                        <strong>Firefox:</strong> Use "Install this site as an app" from the page menu
                    </li>
                </ul>
            </div>
        {/if}
    </div>
{:else}
    <div class="page-padding pwa-section">
        <h3>✅ App Installed</h3>
        <p>Great! You're using the installed version of the app.</p>
    </div>
{/if}

<div class="help">
    <h3>Setup Requirements:</h3>
    <div class="setup-step">
        <h4>Get Access Token</h4>
        <p>The API key above should be a Twitch access token with appropriate scopes.</p>
    </div>

    <h3>How to get these:</h3>
    <ol>
        <li>
            Go to <a href="https://dev.twitch.tv/console" target="_blank"
                >Twitch Developer Console</a
            >
        </li>
        <li>Register your application with redirect URI: <code>http://localhost:3000</code></li>
        <li>
            Generate an access token using OAuth flow or <a
                href="https://twitchtokengenerator.com/"
                target="_blank">Twitch Token Generator</a
            >
        </li>
        <li>Paste the access token in the field above</li>
    </ol>
</div>

<style>
    .setup-form {
        margin: 2rem 0;
    }

    label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: bold;
    }

    input {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid var(--border-color);
        border-radius: 4px;
        font-size: 1rem;
        margin-bottom: 1rem;
        box-sizing: border-box;
        background-color: var(--bg-secondary);
        color: var(--text-primary);
    }

    .api-key-input {
        -webkit-text-security: circle;
    }

    .help-text {
        margin: 0.5rem 0 0 0;
        font-size: 0.875rem;
        color: var(--text-secondary);
        font-style: italic;
    }

    .help {
        margin-top: 3rem;
        padding: 1rem;
        background: var(--bg-secondary);
        border-radius: 8px;
        border: 1px solid var(--border-color);
    }

    .help h3 {
        margin-top: 0;
    }

    .help a {
        color: var(--accent-primary);
    }

    .setup-step {
        margin-bottom: 1.5rem;
    }

    .setup-step h4 {
        margin-bottom: 0.5rem;
        color: var(--text-primary);
    }

    code {
        background: var(--bg-tertiary);
        color: var(--text-primary);
        padding: 0.2rem 0.4rem;
        border-radius: 3px;
        font-family: monospace;
    }

    .pwa-section {
        margin: 2rem 0;
        padding: 1.5rem;
        background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%);
        border-radius: 12px;
        border: 1px solid var(--border-color);
        text-align: center;
    }

    .pwa-section h3 {
        margin-top: 0;
        margin-bottom: 1rem;
        color: var(--text-primary);
        font-size: 1.25rem;
    }

    .install-button {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 1rem 2rem;
        font-size: 1.1rem;
        font-weight: bold;
        background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-hover) 100%);
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        transition:
            transform 0.2s ease,
            box-shadow 0.2s ease;
        box-shadow: 0 4px 12px rgba(145, 70, 255, 0.3);
    }

    .install-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(145, 70, 255, 0.4);
        background: linear-gradient(135deg, var(--accent-hover) 0%, var(--accent-primary) 100%);
    }

    .install-icon {
        font-size: 1.2rem;
    }

    .install-instructions {
        text-align: left;
        max-width: 600px;
        margin: 0 auto;
        background: var(--bg-primary);
        padding: 1.5rem;
        border-radius: 8px;
        border: 1px solid var(--border-color);
    }

    .install-instructions ul {
        margin: 0.5rem 0 1rem 1.5rem;
        padding: 0;
    }

    .install-instructions li {
        margin: 0.5rem 0;
        color: var(--text-secondary);
    }

    .install-instructions strong {
        color: var(--text-primary);
    }
</style>

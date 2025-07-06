<script lang="ts">
    import { oauthToken, currentAccessToken } from "$lib/stores";
    import { initiateOAuth } from "$lib/oauth";
    import { getUser } from "$lib/twitch-api";
    import { clearAllExtensionData } from "$lib/extension-persisted-store";
    import { onMount } from "svelte";

    let deferredPrompt: any = null;
    let showInstallButton = $state(false);
    let isInstalled = $state(false);
    let userInfo = $state<any>(null);
    let authStatus = $state<"loading" | "authenticated" | "unauthenticated">("loading");

    onMount(async () => {
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

        // Check current authentication status
        await checkAuthStatus();
    });

    async function checkAuthStatus() {
        authStatus = "loading";

        const token = $currentAccessToken;
        if (!token) {
            authStatus = "unauthenticated";
            return;
        }

        // Validate current token by trying to get user info
        try {
            userInfo = await getUser(token);
            authStatus = "authenticated";
        } catch (error) {
            // Token is invalid, clear it
            console.error("Token validation failed:", error);
            if ($oauthToken) {
                oauthToken.set(null);
            }
            authStatus = "unauthenticated";
        }
    }

    function logout() {
        oauthToken.set(null);
        userInfo = null;
        authStatus = "unauthenticated";
    }

    function clearAllSettings() {
        if (
            !confirm(
                "Are you sure you want to clear all settings? This will:\n\n• Sign you out\n• Clear all favorite emotes\n• Clear all favorite copypastas\n• Clear all stored data\n• Reset the app to its initial state\n\nThis action cannot be undone.",
            )
        ) {
            return;
        }

        try {
            // Clear all extension data (localStorage and Tampermonkey storage)
            clearAllExtensionData();

            // Reset UI state
            userInfo = null;
            authStatus = "unauthenticated";

            alert("All settings have been cleared successfully!");
        } catch (error) {
            console.error("Error clearing settings:", error);
            alert(
                "There was an error clearing some settings. Please try again or manually clear your browser data.",
            );
        }
    }

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

<!-- Authentication Section -->
<div class="page-padding auth-section">
    {#if authStatus === "loading"}
        <div class="auth-loading">
            <div class="spinner"></div>
            <p>Checking authentication status...</p>
        </div>
    {:else if authStatus === "authenticated"}
        <div class="auth-success">
            <div class="user-info">
                <h3>✅ Authenticated</h3>
                {#if userInfo}
                    <div class="user-details">
                        {#if userInfo.profile_image_url}
                            <img
                                src={userInfo.profile_image_url}
                                alt="Profile"
                                class="profile-image"
                            />
                        {/if}
                        <div class="user-text">
                            <p>
                                <strong>Logged in as:</strong>
                                {userInfo.display_name || userInfo.login}
                            </p>
                            {#if userInfo.email}
                                <p class="user-email">{userInfo.email}</p>
                            {/if}
                        </div>
                    </div>
                {/if}
                <button class="logout-button" onclick={logout}>Sign Out</button>
            </div>
        </div>
    {:else}
        <div class="auth-setup">
            <h3>🔐 Twitch Authentication</h3>
            <p>Connect your Twitch account to use all features of this app.</p>

            <button class="oauth-button" onclick={initiateOAuth}>
                <span class="twitch-icon">🟣</span>
                Sign in with Twitch
            </button>

            <div class="oauth-benefits">
                <h4>Why use OAuth?</h4>
                <ul>
                    <li>✅ Secure authentication</li>
                    <li>✅ Access to your followed channels</li>
                    <li>✅ Send messages to chat</li>
                    <li>✅ Read live chat messages</li>
                    <li>✅ No manual token management</li>
                    <li>✅ Automatic token refresh</li>
                </ul>
            </div>
        </div>
    {/if}
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

{#if authStatus === "unauthenticated"}
    <div class="help">
        <h3>About OAuth Authentication:</h3>
        <div class="setup-step">
            <h4>🔒 Secure & Easy</h4>
            <p>
                OAuth provides secure authentication without exposing your credentials. The app
                requests only the permissions it needs.
            </p>
        </div>

        <div class="setup-step">
            <h4>🔑 Required Permissions</h4>
            <p>This app requests the following scopes:</p>
            <ul>
                <li><code>user:read:email</code> - Read your basic profile information</li>
                <li><code>user:read:follows</code> - Access your followed channels list</li>
                <li><code>user:read:chat</code> - Read chat messages from channels</li>
                <li><code>user:write:chat</code> - Send messages to chat</li>
            </ul>
        </div>
    </div>
{/if}

<!-- Clear Settings Section -->
<div class="page-padding clear-settings-section">
    <h3>🗑️ Clear All Settings</h3>
    <p>Reset the app to its initial state by clearing all stored data.</p>

    <div class="clear-warning">
        <h4>⚠️ Warning</h4>
        <p>This action will permanently delete:</p>
        <ul>
            <li>Your authentication token</li>
            <li>All favorite emotes for all channels</li>
            <li>All favorite copypastas for all channels</li>
            <li>Any other app settings</li>
        </ul>
        <p><strong>This cannot be undone!</strong></p>
    </div>

    <button class="clear-button" onclick={clearAllSettings}>
        <span class="clear-icon">🗑️</span>
        Clear All Settings
    </button>
</div>

<style>
    .auth-section {
        margin: 2rem 0;
    }

    .auth-loading {
        text-align: center;
        padding: 2rem;
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

    .auth-success {
        background: linear-gradient(135deg, #1a4d1a 0%, #2d5a2d 100%);
        border: 1px solid #4a8f4a;
        border-radius: 12px;
        padding: 2rem;
    }

    .user-info h3 {
        margin-top: 0;
        color: #90ee90;
    }

    .user-details {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin: 1rem 0;
        padding: 1rem;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 8px;
    }

    .profile-image {
        width: 50px;
        height: 50px;
        border-radius: 50%;
        border: 2px solid #4a8f4a;
    }

    .user-text p {
        margin: 0.25rem 0;
        color: var(--text-primary);
    }

    .user-email {
        font-size: 0.875rem;
        color: var(--text-secondary);
    }

    .logout-button {
        background: #dc3545;
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        cursor: pointer;
        transition: background-color 0.2s ease;
    }

    .logout-button:hover {
        background: #c82333;
    }

    .auth-setup {
        text-align: center;
    }

    .oauth-button {
        display: inline-flex;
        align-items: center;
        gap: 0.75rem;
        padding: 1rem 2rem;
        font-size: 1.1rem;
        font-weight: bold;
        background: linear-gradient(135deg, #9146ff 0%, #772ce8 100%);
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 4px 12px rgba(145, 70, 255, 0.3);
        margin: 1rem 0;
    }

    .oauth-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(145, 70, 255, 0.4);
        background: linear-gradient(135deg, #772ce8 0%, #9146ff 100%);
    }

    .twitch-icon {
        font-size: 1.2rem;
    }

    .oauth-benefits {
        text-align: left;
        max-width: 400px;
        margin: 2rem auto;
        padding: 1.5rem;
        background: var(--bg-secondary);
        border-radius: 8px;
        border: 1px solid var(--border-color);
    }

    .oauth-benefits h4 {
        margin-top: 0;
        color: var(--text-primary);
    }

    .oauth-benefits ul {
        margin: 0.5rem 0;
        padding-left: 1.5rem;
    }

    .oauth-benefits li {
        margin: 0.5rem 0;
        color: var(--text-secondary);
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

    .clear-settings-section {
        margin: 3rem 0;
        border-top: 1px solid var(--border-color);
        padding-top: 3rem;
    }

    .clear-warning {
        background: linear-gradient(135deg, #4d1a1a 0%, #5a2d2d 100%);
        border: 1px solid #8f4a4a;
        border-radius: 8px;
        padding: 1.5rem;
        margin: 1.5rem 0;
        max-width: 500px;
    }

    .clear-warning h4 {
        margin-top: 0;
        color: #ff9999;
    }

    .clear-warning ul {
        margin: 0.5rem 0;
        padding-left: 1.5rem;
    }

    .clear-warning li {
        margin: 0.3rem 0;
        color: #ffcccc;
    }

    .clear-button {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 1rem 2rem;
        font-size: 1.1rem;
        font-weight: bold;
        background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
        margin: 1rem 0;
    }

    .clear-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(220, 53, 69, 0.4);
        background: linear-gradient(135deg, #c82333 0%, #dc3545 100%);
    }

    .clear-icon {
        font-size: 1.2rem;
    }
</style>

<script lang="ts">
    import { twitchApiKey } from "$lib/stores";
</script>

<svelte:head>
    <title>Emote App - Setup</title>
</svelte:head>

<main>
    <nav>
        <a href="/">Channels</a>
        <span class="separator">›</span>
        <span>Setup</span>
    </nav>

    <h1>Setup</h1>

    <div class="setup-form">
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
</main>

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
        border: 1px solid #ccc;
        border-radius: 4px;
        font-size: 1rem;
        margin-bottom: 1rem;
        box-sizing: border-box;
    }

    .api-key-input {
        -webkit-text-security: circle;
    }

    .help-text {
        margin: 0.5rem 0 0 0;
        font-size: 0.875rem;
        color: #666;
        font-style: italic;
    }

    .help {
        margin-top: 3rem;
        padding: 1rem;
        background: #f9f9f9;
        border-radius: 8px;
    }

    .help h3 {
        margin-top: 0;
    }

    .help a {
        color: #0066cc;
    }

    .setup-step {
        margin-bottom: 1.5rem;
    }

    .setup-step h4 {
        margin-bottom: 0.5rem;
        color: #333;
    }

    code {
        background: #f1f1f1;
        padding: 0.2rem 0.4rem;
        border-radius: 3px;
        font-family: monospace;
    }
</style>

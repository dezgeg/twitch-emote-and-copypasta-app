<script lang="ts">
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";

    let apiKey = "";

    onMount(() => {
        const storedApiKey = localStorage.getItem("twitchApiKey");
        if (storedApiKey) {
            apiKey = storedApiKey;
        }
    });

    function saveApiKey() {
        if (!apiKey.trim()) {
            alert("Please enter a valid API key");
            return;
        }

        localStorage.setItem("twitchApiKey", apiKey.trim());
        goto("/");
    }
</script>

<svelte:head>
    <title>Emote App - Setup</title>
</svelte:head>

<main>
    <h1>Setup</h1>

    <div class="setup-form">
        <label for="apiKey">Twitch API Key:</label>
        <input
            id="apiKey"
            type="password"
            bind:value={apiKey}
            placeholder="Enter your Twitch API key"
        />

        <div class="buttons">
            <button on:click={saveApiKey}> Save </button>
            <a href="/" class="button"> Back to Channels </a>
        </div>
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
    main {
        max-width: 600px;
    }

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

    .buttons {
        display: flex;
        gap: 1rem;
    }

    button,
    .button {
        padding: 0.75rem 1.5rem;
        font-size: 1rem;
        text-align: center;
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

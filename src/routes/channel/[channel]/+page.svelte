<script lang="ts">
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";
    import { loadAllEmotes, getEmoteOrPlaceholder, type Emote } from "$lib/emote-api";
    import { twitchApiKey, getFavoriteEmotesStore, getFavoriteCopypastasStore } from "$lib/stores";
    import { sendChatMessage, getUser } from "$lib/twitch-api";
    import Spinner from "$lib/components/Spinner.svelte";
    import EmoteCard from "$lib/components/EmoteCard.svelte";
    import ChatMessageCard from "$lib/components/ChatMessageCard.svelte";
    import { base } from "$app/paths";

    let channel: string;
    let favoriteEmotes: Emote[] = [];
    let allEmotes: Map<string, Emote> = new Map();
    let loading = true;
    let error = "";
    let broadcasterId: string = "";
    let senderId: string = "";
    let lastSentMessage: string = "";

    $: channel = $page.params.channel;
    $: favoriteEmotesStore = getFavoriteEmotesStore(channel);
    $: favoriteCopypastasStore = getFavoriteCopypastasStore(channel);

    onMount(async () => {
        await loadFavoriteEmotes();
        await loadUserIds();
    });

    async function loadFavoriteEmotes() {
        try {
            // If we have favorite emotes, fetch their current URLs
            if ($favoriteEmotesStore.length > 0) {
                await fetchEmoteUrls();
            }
        } catch (err) {
            console.error("Error loading favorite emotes:", err);
            error = err instanceof Error ? err.message : "Failed to load favorites";
        } finally {
            loading = false;
        }
    }

    async function fetchEmoteUrls() {
        try {
            if (!$twitchApiKey) {
                goto(`${base}/setup`);
                return;
            }

            // Fetch all available emotes
            allEmotes = await loadAllEmotes($twitchApiKey, channel);

            // Match favorite names with current emote data
            favoriteEmotes = $favoriteEmotesStore.map((name) =>
                getEmoteOrPlaceholder(allEmotes, name),
            );
        } catch (err) {
            console.error("Error fetching emote URLs:", err);
            // If API fails, show emotes without images
            favoriteEmotes = $favoriteEmotesStore.map((name) =>
                getEmoteOrPlaceholder(new Map(), name),
            );
        }
    }

    async function loadUserIds() {
        try {
            if (!$twitchApiKey) {
                goto(`${base}/setup`);
                return;
            }

            // Get current user and broadcaster info once and cache them
            const [currentUser, broadcaster] = await Promise.all([
                getUser($twitchApiKey),
                getUser($twitchApiKey, channel),
            ]);

            senderId = currentUser.id;
            broadcasterId = broadcaster.id;
        } catch (err) {
            console.error("Error loading user IDs:", err);
            error = err instanceof Error ? err.message : "Failed to load user information";
        }
    }

    async function sendToChat(item: { name: string; url: string } | string) {
        try {
            if (!$twitchApiKey) {
                throw new Error("No API key configured");
            }

            if (!broadcasterId || !senderId) {
                throw new Error("User information not loaded yet");
            }

            let text = typeof item === "string" ? item : item.name;

            // If the message is identical to the last sent message, append a space
            // This prevents Twitch's duplicate message prevention
            if (text === lastSentMessage) {
                text += " \u{E0000}";
            }

            await sendChatMessage($twitchApiKey, broadcasterId, senderId, text);
            lastSentMessage = text;
        } catch (err) {
            console.error("Failed to send to chat:", err);
            showNotification(
                `Failed to send message: ${err instanceof Error ? err.message : "Unknown error"}`,
            );
        }
    }

    function showNotification(message: string) {
        const notification = document.createElement("div");
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #dc3545;
            color: white;
            padding: 1rem;
            border-radius: 8px;
            z-index: 1000;
            font-size: 0.875rem;
            font-weight: bold;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            max-width: 300px;
            word-wrap: break-word;
        `;
        document.body.appendChild(notification);

        // Auto-remove notification after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
</script>

<svelte:head>
    <title>Twitch Emote and Copypasta App - {channel} Favorites</title>
</svelte:head>

{#if loading}
    <Spinner />
{:else if error}
    <div class="error">
        <p>Error: {error}</p>
    </div>
{:else}
    <div class="page-padding favorites-container">
        <section class="emotes-section">
            <div class="emotes-grid">
                {#each favoriteEmotes as emote (emote.name)}
                    <EmoteCard {emote} mode="view" onClick={sendToChat} />
                {:else}
                    <p>No favorite emotes yet.</p>
                {/each}
            </div>
        </section>

        <hr class="section-separator" />

        <section class="copypastas-section">
            <div class="copypastas-list">
                {#each $favoriteCopypastasStore as copypasta (copypasta)}
                    <ChatMessageCard message={copypasta} emotes={allEmotes} onClick={sendToChat} />
                {:else}
                    <p>No favorite copypastas yet.</p>
                {/each}
            </div>
        </section>
    </div>
{/if}

<style>
    .section-separator {
        border: none;
        border-top: 1px solid var(--border-color);
        margin: 1rem 0;
    }

    .emotes-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(50px, 1fr));
        gap: 0.125rem;
    }

    .copypastas-list {
        display: flex;
        flex-direction: column;
        gap: 0.125rem;
    }

    @media (max-width: 600px) {
        .emotes-grid {
            grid-template-columns: repeat(auto-fill, minmax(45px, 1fr));
            gap: 0.0625rem;
        }
    }
</style>

<script lang="ts">
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";
    import { browser } from "$app/environment";
    import { loadAllEmotes, getEmoteOrPlaceholder, type Emote } from "$lib/emote-api";
    import {
        currentAccessToken,
        getFavoriteEmotesStore,
        getFavoriteCopypastasStore,
    } from "$lib/stores";
    import { sendChatMessage, getUser } from "$lib/twitch-api";
    import FetchStatus from "$lib/components/FetchStatus.svelte";
    import EmoteCard from "$lib/components/EmoteCard.svelte";
    import CopypastaCard from "$lib/components/CopypastaCard.svelte";
    import ChatPanel from "$lib/components/ChatPanel.svelte";
    import { base } from "$app/paths";

    let fetchStatus: any;
    let allEmotes = $state(new Map<string, Emote>());
    let broadcasterId = $state("");
    let senderId = $state("");
    let lastSentMessage = $state("");

    let channel = $derived($page.params.channel);
    let favoriteEmotesStore = $derived(getFavoriteEmotesStore(channel));
    let favoriteCopypastasStore = $derived(getFavoriteCopypastasStore(channel));

    // Detect if running in iframe
    let isInIframe = $derived(browser && window.self !== window.top);

    onMount(async () => {
        fetchStatus.run(async () => {
            // Load emotes and user IDs in parallel
            await Promise.all([loadEmotes(), loadUserIds()]);
        });
    });

    async function loadEmotes() {
        if (!$currentAccessToken) {
            goto(`${base}/setup`);
            return;
        }

        try {
            // Fetch all available emotes
            allEmotes = await loadAllEmotes($currentAccessToken, channel);
        } catch (err) {
            console.error("Error fetching emote URLs:", err);
            // If API fails, allEmotes remains empty and getEmoteOrPlaceholder will handle it
        }
    }

    async function loadUserIds() {
        if (!$currentAccessToken) {
            goto(`${base}/setup`);
            return;
        }

        // Get current user and broadcaster info once and cache them
        const [currentUser, broadcaster] = await Promise.all([
            getUser($currentAccessToken),
            getUser($currentAccessToken, channel),
        ]);

        senderId = currentUser.id;
        broadcasterId = broadcaster.id;
    }

    async function sendToChat(item: { name: string; url: string } | string) {
        try {
            if (!$currentAccessToken) {
                throw new Error("No access token configured");
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

            await sendChatMessage($currentAccessToken, broadcasterId, senderId, text);
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

<FetchStatus bind:this={fetchStatus} errorPrefix="Failed to load channel data">
    <div class="main-container" class:iframe={isInIframe}>
        <div class="favorites-content">
            <div class="page-padding">
                <section class="emotes-section">
                    <div class="emotes-grid">
                        {#each $favoriteEmotesStore as emoteName (emoteName)}
                            {@const emote = getEmoteOrPlaceholder(allEmotes, emoteName)}
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
                            <CopypastaCard
                                message={copypasta}
                                emotes={allEmotes}
                                onClick={sendToChat}
                            />
                        {:else}
                            <p>No favorite copypastas yet.</p>
                        {/each}
                    </div>
                </section>
            </div>
        </div>

        <ChatPanel {channel} emotes={allEmotes} />
    </div>
</FetchStatus>

<style>
    .main-container {
        display: flex;
        flex-direction: column;
        height: calc(100vh - var(--nav-height, 1cm));
    }

    .main-container.iframe {
        height: calc(100vh - 48px);
        flex-direction: column;
        overflow: hidden;
        width: 100%;
    }

    .favorites-content {
        flex: 1;
        overflow-y: auto;
    }

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

    /* Desktop layout - sidebar */
    @media (min-width: 1024px) {
        .main-container:not(.iframe) {
            flex-direction: row;
        }

        .main-container:not(.iframe) .favorites-content {
            flex: 1;
            border-right: 1px solid var(--border-color);
        }

        /* In iframe, keep vertical layout even on desktop for better fit */
        .main-container.iframe {
            flex-direction: column;
        }
    }

    @media (max-width: 600px) {
        .emotes-grid {
            grid-template-columns: repeat(auto-fill, minmax(45px, 1fr));
            gap: 0.0625rem;
        }
    }
</style>

// ==UserScript==
// @name         Twitch Emote App Overlay
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Overlay the Twitch Emote and Copypasta App on Twitch pages
// @author       You
// @match        https://www.twitch.tv/*
// @match        https://twitch.tv/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    "use strict";

    // Configuration - Update this URL to match your GitHub Pages deployment
    //const EMOTE_APP_URL = 'https://dezgeg.github.io/twitch-emote-and-copypasta-app';
    const EMOTE_APP_URL = "http://localhost:5173";

    let overlay = null;
    let isVisible = false;
    let iframe = null;
    let currentChannel = null;

    // Extract channel name from Twitch URL
    function getCurrentChannel() {
        const path = window.location.pathname;
        const match = path.match(/^\/([^\/]+)(?:\/|$)/);

        // Skip known non-channel paths
        if (
            !match ||
            [
                "directory",
                "settings",
                "following",
                "browse",
                "p",
                "u",
                "dashboard",
                "friends",
                "inventory",
                "prime",
                "subscriptions",
                "wallet",
                "drops",
            ].includes(match[1])
        ) {
            return null;
        }

        return match[1];
    }

    // Create the overlay
    function createOverlay() {
        if (overlay) return;

        // Create overlay container
        overlay = document.createElement("div");
        overlay.id = "emote-app-overlay";
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: -24rem;
            width: 24rem;
            height: 100vh;
            background: rgba(0, 0, 0, 0.95);
            backdrop-filter: blur(10px);
            z-index: 9999;
            border-right: 2px solid #9146ff;
            transition: left 0.3s ease-in-out;
            box-shadow: 5px 0 20px rgba(0, 0, 0, 0.5);
        `;

        // Create iframe for the emote app
        iframe = document.createElement("iframe");
        const channelPath = currentChannel ? `/channel/${currentChannel}` : "";
        iframe.src = EMOTE_APP_URL + channelPath;
        iframe.style.cssText = `
            width: 100%;
            height: 100%;
            border: none;
            background: white;
        `;

        overlay.appendChild(iframe);
        document.body.appendChild(overlay);
    }

    // Show overlay
    function showOverlay() {
        if (!overlay) createOverlay();

        isVisible = true;
        overlay.style.left = "0";

        // Focus the iframe to allow keyboard navigation
        setTimeout(() => {
            if (iframe) iframe.focus();
        }, 300);
    }

    // Hide overlay
    function hideOverlay() {
        if (!overlay) return;

        isVisible = false;
        overlay.style.left = "-24rem";
    }

    // Toggle overlay
    function toggleOverlay() {
        if (isVisible) {
            hideOverlay();
        } else {
            showOverlay();
        }
    }

    // Create toggle button
    function createToggleButton() {
        currentChannel = getCurrentChannel();
        const isEnabled = currentChannel !== null;

        const button = document.createElement("button");
        button.innerHTML = `<svg width="24" height="24" viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#9146FF;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#772CE8;stop-opacity:1" />
                </linearGradient>
                <linearGradient id="faceGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#FFD700;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#FFA500;stop-opacity:1" />
                </linearGradient>
            </defs>
            <circle cx="96" cy="96" r="88" fill="url(#bgGradient)" stroke="#FFFFFF" stroke-width="8"/>
            <path d="M40 60 Q40 45 55 45 L137 45 Q152 45 152 60 L152 100 Q152 115 137 115 L85 115 L65 135 L65 115 L55 115 Q40 115 40 100 Z" fill="#FFFFFF" stroke="none"/>
            <circle cx="96" cy="82" r="28" fill="url(#faceGradient)" stroke="#333333" stroke-width="2"/>
            <ellipse cx="88" cy="76" rx="4" ry="6" fill="#333333"/>
            <ellipse cx="104" cy="76" rx="4" ry="6" fill="#333333"/>
            <path d="M82 85 Q96 95 110 85" stroke="#333333" stroke-width="3" fill="none" stroke-linecap="round"/>
            <rect x="48" y="100" width="20" height="2" rx="1" fill="#9146FF" opacity="0.6"/>
            <rect x="72" y="100" width="16" height="2" rx="1" fill="#9146FF" opacity="0.6"/>
            <rect x="48" y="105" width="24" height="2" rx="1" fill="#9146FF" opacity="0.6"/>
        </svg>`;

        button.title = isEnabled
            ? `Toggle Emote App (${currentChannel})`
            : "Emote App (only available on channel pages)";
        button.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 48px;
            height: 48px;
            background: ${isEnabled ? "#9146ff" : "#666666"};
            color: white;
            border: none;
            border-radius: 0;
            cursor: ${isEnabled ? "pointer" : "not-allowed"};
            z-index: 9998;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            transition: background-color 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 6px;
            opacity: ${isEnabled ? "1" : "0.5"};
        `;

        // Add CSS hover rule
        const style = document.createElement("style");
        style.textContent = `
            #emote-toggle-button:hover {
                background: ${isEnabled ? "#7c3aed" : "#666666"} !important;
            }
        `;
        document.head.appendChild(style);
        button.id = "emote-toggle-button";

        if (isEnabled) {
            button.addEventListener("click", toggleOverlay);
        }
        document.body.appendChild(button);
    }

    // Wait for page to load and create toggle button
    function init() {
        // Create toggle button after a short delay to ensure page is ready
        setTimeout(() => {
            createToggleButton();
        }, 2000);
    }

    // Handle SPA navigation on Twitch
    let currentUrl = window.location.href;
    const observer = new MutationObserver(() => {
        if (window.location.href !== currentUrl) {
            currentUrl = window.location.href;
            // Clean up existing elements
            const existingButton = document.querySelector('button[title="Toggle Emote App"]');
            if (existingButton) {
                existingButton.remove();
            }
            if (overlay) {
                overlay.remove();
                overlay = null;
                iframe = null;
                isVisible = false;
            }
            // Reinitialize
            init();
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });

    // Keyboard shortcut (Ctrl/Cmd + E)
    document.addEventListener("keydown", (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "e") {
            e.preventDefault();
            toggleOverlay();
        }
    });

    // Listen for close messages from iframe
    window.addEventListener("message", (event) => {
        if (event.data === "closeEmoteOverlay") {
            hideOverlay();
        }
    });

    // Initialize
    init();

    console.log("Twitch Emote App Overlay loaded");
})();

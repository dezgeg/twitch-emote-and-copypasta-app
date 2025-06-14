<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { TWITCH_CLIENT_ID } from '$lib/config';

	let channels: Array<{broadcaster_id: string, broadcaster_login: string, broadcaster_name: string}> = [];
	let loading = true;
	let error = '';

	onMount(async () => {
		const apiKey = localStorage.getItem('twitchApiKey');
		if (!apiKey) {
			goto('/setup');
			return;
		}
		
		await fetchFollowedChannels(apiKey);
	});

	async function fetchFollowedChannels(apiKey: string) {
		try {
			// First get user info to get user ID
			const userResponse = await fetch('https://api.twitch.tv/helix/users', {
				headers: {
					'Authorization': `Bearer ${apiKey}`,
					'Client-Id': TWITCH_CLIENT_ID
				}
			});

			if (!userResponse.ok) {
				throw new Error(`Failed to get user info: ${userResponse.status}`);
			}

			const userData = await userResponse.json();
			const userId = userData.data[0]?.id;

			if (!userId) {
				throw new Error('Could not get user ID');
			}

			// Get followed channels
			const followsResponse = await fetch(`https://api.twitch.tv/helix/channels/followed?user_id=${userId}`, {
				headers: {
					'Authorization': `Bearer ${apiKey}`,
					'Client-Id': TWITCH_CLIENT_ID
				}
			});

			if (!followsResponse.ok) {
				throw new Error(`Failed to get followed channels: ${followsResponse.status}`);
			}

			const followsData = await followsResponse.json();
			channels = followsData.data || [];
		} catch (err) {
			console.error('Error fetching channels:', err);
			error = err instanceof Error ? err.message : 'Failed to fetch channels';
		} finally {
			loading = false;
		}
	}

	function goToChannel(channel: string) {
		goto(`/channel/${channel}`);
	}

	function goToSetup() {
		goto('/setup');
	}
</script>

<svelte:head>
	<title>Emote App - Channels</title>
</svelte:head>

<main>
	<h1>Your Followed Channels</h1>
	
	{#if loading}
		<p>Loading channels...</p>
	{:else if error}
		<div class="error">
			<p>Error: {error}</p>
			<p>Please check your API key configuration.</p>
		</div>
		<nav>
			<button on:click={goToSetup}>Setup</button>
		</nav>
	{:else}
		<div class="channels">
			{#each channels as channel}
				<button class="channel-card" on:click={() => goToChannel(channel.broadcaster_login)}>
					<div class="channel-name">{channel.broadcaster_name}</div>
					<div class="channel-login">@{channel.broadcaster_login}</div>
				</button>
			{:else}
				<p>No followed channels found.</p>
			{/each}
		</div>
		
		<nav>
			<button on:click={goToSetup}>Setup</button>
		</nav>
	{/if}
</main>

<style>
	main {
		padding: 1rem;
		max-width: 800px;
		margin: 0 auto;
	}

	.channels {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 1rem;
		margin: 2rem 0;
	}

	.channel-card {
		padding: 1rem;
		border: 1px solid #ccc;
		border-radius: 8px;
		background: white;
		cursor: pointer;
		font-size: 1rem;
	}

	.channel-card:hover {
		background: #f5f5f5;
	}

	.channel-name {
		font-weight: bold;
		margin-bottom: 0.25rem;
	}

	.channel-login {
		font-size: 0.875rem;
		color: #666;
	}

	.error {
		padding: 1rem;
		background: #fee;
		border: 1px solid #fcc;
		border-radius: 8px;
		color: #c00;
		text-align: center;
		margin: 2rem 0;
	}

	nav {
		margin-top: 2rem;
		text-align: center;
	}

	button {
		padding: 0.5rem 1rem;
		border: 1px solid #ccc;
		border-radius: 4px;
		background: white;
		cursor: pointer;
	}

	button:hover {
		background: #f5f5f5;
	}
</style>

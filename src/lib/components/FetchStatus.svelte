<script lang="ts">
    import Spinner from "./Spinner.svelte";

    interface Props {
        errorPrefix?: string;
        children: any;
    }

    let { errorPrefix = "", children }: Props = $props();

    let loading = $state(true);
    let error = $state("");

    export function run(asyncFn: () => Promise<void>) {
        loading = true;
        error = "";

        asyncFn()
            .catch((err) => {
                const errorMessage = err instanceof Error ? err.message : String(err);
                error = errorPrefix ? `${errorPrefix}: ${errorMessage}` : errorMessage;
            })
            .finally(() => {
                loading = false;
            });
    }
</script>

{#if loading}
    <Spinner />
{:else if error}
    <div class="error">
        <p>Error: {error}</p>
    </div>
{:else}
    {@render children()}
{/if}

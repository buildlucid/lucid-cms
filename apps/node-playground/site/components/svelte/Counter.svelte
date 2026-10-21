<script lang="ts">
	import type { Snippet } from "svelte";

	let { start = 0, children }: { start?: number; children?: Snippet } = $props();
	let count = $derived(start);
	const id = $props.id();
</script>

<div class="svelte-counter">
	<label for={id}>Svelte count</label> <output {id}>{count}</output>
	<button type="button" onclick={() => count++}>Add one</button>
	{@render children?.()}
</div>

<style>
	.svelte-counter {
		border: 1px dotted currentColor;
		padding: 1rem;
	}
</style>

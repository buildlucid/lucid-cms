<script lang="ts">
	import type { Snippet } from "svelte";

	/** A stopwatch with start, stop and reset, rendering Kiln content below it. */
	let { children }: { children?: Snippet } = $props();
	let elapsed = $state(0);
	let running = $state(false);

	$effect(() => {
		if (!running) return;
		const started = Date.now() - elapsed;
		const timer = setInterval(() => {
			elapsed = Date.now() - started;
		}, 100);
		return () => clearInterval(timer);
	});
</script>

<div class="stopwatch">
	<output>{(elapsed / 1000).toFixed(1)}s</output>
	<button type="button" onclick={() => (running = !running)}>{running ? "Stop" : "Start"}</button>
	<button type="button" class="button--quiet" disabled={running || elapsed === 0} onclick={() => (elapsed = 0)}>Reset</button>
	{@render children?.()}
</div>

<style>
	.stopwatch {
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 1rem;
	}

	output {
		display: inline-block;
		font: 600 1.25rem/1 var(--mono);
		min-width: 5ch;
	}
</style>

import type { Component } from "solid-js";

const FullPageLoading: Component = () => {
	return (
		<div
			class="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-t-xl bg-background-base/40 border-border border"
			role="status"
			aria-live="polite"
			aria-label="Loading Lucid CMS"
		>
			<span class="sr-only">Loading Lucid CMS</span>
			<span class="skeleton-shimmer absolute inset-0 opacity-80" />
		</div>
	);
};

export default FullPageLoading;

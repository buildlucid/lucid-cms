import type { Component } from "solid-js";

export const PageLayoutCorners: Component = () => {
	// ----------------------------------------
	// Render
	return (
		<>
			<span
				aria-hidden="true"
				class="fixed top-0 inset-s-sidebar inset-e-0 z-35 hidden h-4 bg-sidebar md:block"
			/>
			<div
				aria-hidden="true"
				class="sticky top-4 z-35 hidden border-t border-border md:block"
			>
				<span class="inverted-corner-left absolute top-0 left-0 size-3 bg-border" />
				<span class="inverted-corner-left absolute -top-px -left-px size-3 bg-sidebar" />
				<span class="inverted-corner-right absolute top-0 right-0 size-3 bg-border" />
				<span class="inverted-corner-right absolute -top-px -right-px size-3 bg-sidebar" />
			</div>
		</>
	);
};

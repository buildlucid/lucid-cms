import type { Component } from "solid-js";

/** Keeps the page's rounded corners and edge in place while the body scrolls behind them. Render one at each end of the layout root. */
export const PageLayoutCorners: Component<{
	position: "top" | "bottom";
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<>
			<span
				aria-hidden="true"
				class="fixed inset-s-sidebar inset-e-agent-panel z-35 hidden h-4 bg-sidebar md:block"
				classList={{
					"top-0": props.position === "top",
					"bottom-0": props.position === "bottom",
				}}
			/>
			<div
				aria-hidden="true"
				class="sticky z-35 hidden border-border md:block"
				classList={{
					"top-4 border-t": props.position === "top",
					"bottom-4 border-b": props.position === "bottom",
				}}
			>
				{props.position === "top" ? (
					<>
						<span class="inverted-corner-top-left absolute top-0 left-0 size-3 bg-border" />
						<span class="inverted-corner-top-left absolute -top-px -left-px size-3 bg-sidebar" />
						<span class="inverted-corner-top-right absolute top-0 right-0 size-3 bg-border" />
						<span class="inverted-corner-top-right absolute -top-px -right-px size-3 bg-sidebar" />
					</>
				) : (
					<>
						<span class="inverted-corner-bottom-left absolute bottom-0 left-0 size-3 bg-border" />
						<span class="inverted-corner-bottom-left absolute -bottom-px -left-px size-3 bg-sidebar" />
						<span class="inverted-corner-bottom-right absolute right-0 bottom-0 size-3 bg-border" />
						<span class="inverted-corner-bottom-right absolute -right-px -bottom-px size-3 bg-sidebar" />
					</>
				)}
			</div>
		</>
	);
};

import classNames from "classnames";
import type { Component } from "solid-js";
import navigationStore from "@/store/navigationStore/navigationStore";

/**
 * Fixed layout corners above scrolling content. Render at both ends of the layout root. `tight`
 * uses an 8px gap and `rounded-lg`; default uses 16px and `rounded-xl`.
 */
export const PageLayoutCorners: Component<{
	position: "top" | "bottom";
	tight?: boolean;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const top = () => props.position === "top";
	const corner = () => (props.tight ? "size-2" : "size-3");

	// ----------------------------------------
	// Render
	return (
		<>
			<span
				aria-hidden="true"
				class={classNames(
					"fixed inset-e-agent-panel z-35 hidden bg-sidebar md:block",
					navigationStore.get.tucked ? "inset-s-0" : "inset-s-sidebar",
					props.tight ? "h-2" : "h-4",
					top() ? "top-0" : "bottom-0",
				)}
			/>
			<div
				aria-hidden="true"
				class={classNames("sticky z-35 hidden border-border md:block", {
					"[--inverted-corner-radius:var(--radius-lg)]": props.tight,
					"top-2 border-t": top() && props.tight,
					"top-4 border-t": top() && !props.tight,
					"bottom-2 border-b": !top() && props.tight,
					"bottom-4 border-b": !top() && !props.tight,
				})}
			>
				{top() ? (
					<>
						<span
							class={classNames(
								"inverted-corner-top-left absolute top-0 left-0 bg-border",
								corner(),
							)}
						/>
						<span
							class={classNames(
								"inverted-corner-top-left absolute -top-px -left-px bg-sidebar",
								corner(),
							)}
						/>
						<span
							class={classNames(
								"inverted-corner-top-right absolute top-0 right-0 bg-border",
								corner(),
							)}
						/>
						<span
							class={classNames(
								"inverted-corner-top-right absolute -top-px -right-px bg-sidebar",
								corner(),
							)}
						/>
					</>
				) : (
					<>
						<span
							class={classNames(
								"inverted-corner-bottom-left absolute bottom-0 left-0 bg-border",
								corner(),
							)}
						/>
						<span
							class={classNames(
								"inverted-corner-bottom-left absolute -bottom-px -left-px bg-sidebar",
								corner(),
							)}
						/>
						<span
							class={classNames(
								"inverted-corner-bottom-right absolute right-0 bottom-0 bg-border",
								corner(),
							)}
						/>
						<span
							class={classNames(
								"inverted-corner-bottom-right absolute -right-px -bottom-px bg-sidebar",
								corner(),
							)}
						/>
					</>
				)}
			</div>
		</>
	);
};

import classNames from "classnames";
import type { Component, JSXElement } from "solid-js";

export interface KbdProps {
	/** `inverse` suits dark surfaces such as tooltips. @default "default" */
	variant?: "default" | "inverse";
	class?: string;
	children: JSXElement;
}

/**
 * A key or key combination, as shown beside the action it triggers.
 *
 * @example
 * ```tsx
 * import { Kbd } from "@lucidcms/admin/components";
 *
 * return <Kbd>⌘K</Kbd>;
 * ```
 */
const Kbd: Component<KbdProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<kbd
			data-kbd
			class={classNames(
				"inline-flex h-5 min-w-5 items-center justify-center rounded-sm px-1 font-body text-2xs font-medium",
				props.variant === "inverse"
					? "bg-secondary-foreground/15 text-secondary-foreground"
					: "border border-border bg-background text-subtitle",
				props.class,
			)}
		>
			{props.children}
		</kbd>
	);
};

export default Kbd;

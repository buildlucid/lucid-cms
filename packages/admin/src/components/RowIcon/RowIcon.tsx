import classNames from "classnames";
import type { Component, JSXElement } from "solid-js";

interface RowIconProps {
	class?: string;
	children: JSXElement;
}

/** The round icon at the start of a list row, such as auth providers, passkeys, integrations and OAuth connections. */
const RowIcon: Component<RowIconProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<span
			class={classNames(
				"flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-card text-icon",
				props.class,
			)}
		>
			{props.children}
		</span>
	);
};

export default RowIcon;

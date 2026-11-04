import classNames from "classnames";
import type { Component } from "solid-js";

/**
 * Edge marker for hidden controls. Remains visible on light and dark backgrounds and brightens on
 * parent `group` hover. Position with `class`.
 */
const HoverRevealBar: Component<{
	orientation: "horizontal" | "vertical";
	/** Fades it out, eg. while what it reveals is showing. */
	hidden: boolean;
	class?: string;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<span
			aria-hidden="true"
			class={classNames(
				"pointer-events-none absolute rounded-full bg-white shadow-[0_0_0_1px_rgb(0_0_0/0.15)] transition-opacity duration-200",
				props.orientation === "horizontal" ? "h-1 w-20" : "h-20 w-1",
				props.hidden ? "opacity-0" : "opacity-40 group-hover:opacity-75",
				props.class,
			)}
		/>
	);
};

export default HoverRevealBar;

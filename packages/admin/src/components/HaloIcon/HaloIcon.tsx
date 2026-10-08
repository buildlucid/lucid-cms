import classnames from "classnames";
import type { Component, JSXElement } from "solid-js";
import IconContainer from "@/components/IconContainer/IconContainer";

export interface HaloIconProps {
	/** An icon with automatic SVG sizing. */
	children: JSXElement;
	class?: string;
}

/** Renders an icon tile with a fading dotted halo. */
const HaloIcon: Component<HaloIconProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<div
			data-halo-icon
			class={classnames(
				"dotted-halo grid h-21 w-33 place-items-center",
				props.class,
			)}
		>
			<IconContainer size="large" class="relative [&_svg]:size-5">
				{props.children}
			</IconContainer>
		</div>
	);
};

export default HaloIcon;

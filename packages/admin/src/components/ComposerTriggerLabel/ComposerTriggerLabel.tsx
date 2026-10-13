import { TbOutlineChevronDown, TbOutlineChevronRight } from "solid-icons/tb";
import type { Component, JSXElement } from "solid-js";
import { Dynamic } from "solid-js/web";

/** Renders a trigger icon, label and chevron; provide a title because narrow composers can hide the label. */
const ComposerTriggerLabel: Component<{
	icon: JSXElement;
	label: string;
	alwaysShowLabel?: boolean;
	/** `right` for triggers that open somewhere else rather than a menu. @default "down" */
	chevron?: "down" | "right";
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<>
			{props.icon}
			<span
				class={
					props.alwaysShowLabel
						? "truncate"
						: "hidden truncate @md/composer:inline"
				}
			>
				{props.label}
			</span>
			<Dynamic
				component={
					props.chevron === "right"
						? TbOutlineChevronRight
						: TbOutlineChevronDown
				}
				size={9}
				class="shrink-0"
			/>
		</>
	);
};

export default ComposerTriggerLabel;

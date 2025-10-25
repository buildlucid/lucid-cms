import { DropdownMenu } from "@kobalte/core";
import classNames from "classnames";
import type { Component, JSXElement, ValidComponent } from "solid-js";

interface DropdownContentProps {
	options?: {
		as?: ValidComponent;
		class?: string;
		rounded?: boolean;
		anchorWidth?: boolean;
		maxHeight?: "md";
		noMargin?: boolean;
		raised?: boolean;
	};
	children: JSXElement;
}

const DropdownContent: Component<DropdownContentProps> = (props) => {
	return (
		<DropdownMenu.Portal>
			<DropdownMenu.Content
				as={props.options?.as}
				class={classNames(
					"bg-dropdown-base border border-border px-2.5 py-2.5 shadow-md animate-animate-dropdown focus:outline-hidden scrollbar",
					{
						"rounded-md": props.options?.rounded,
						"max-h-60 overflow-y-auto": props.options?.maxHeight === "md",
						"mt-2": props.options?.noMargin !== true,
						"z-40": props.options?.raised,
					},
					props.options?.class,
				)}
				style={{
					width: props.options?.anchorWidth
						? "var(--kb-popper-anchor-width)"
						: undefined,
				}}
			>
				{props.children}
			</DropdownMenu.Content>
		</DropdownMenu.Portal>
	);
};

export default DropdownContent;

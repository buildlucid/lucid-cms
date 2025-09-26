import type { Component, JSXElement, ValidComponent } from "solid-js";
import classNames from "classnames";
import { DropdownMenu } from "@kobalte/core";

interface DropdownContentProps {
	options?: {
		as?: ValidComponent;
		class?: string;
		rounded?: boolean;
		anchorWidth?: boolean;
		maxHeight?: "md";
	};
	children: JSXElement;
}

const DropdownContent: Component<DropdownContentProps> = (props) => {
	return (
		<DropdownMenu.Portal>
			<DropdownMenu.Content
				as={props.options?.as}
				class={classNames(
					"bg-dropdown-base border border-border px-2.5 py-2.5 shadow-md animate-animate-dropdown focus:outline-hidden focus:ring-1 ring-primary-base scrollbar",
					{
						"rounded-md": props.options?.rounded,
						"max-h-60 overflow-y-auto": props.options?.maxHeight === "md",
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

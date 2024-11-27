import type { Component, JSXElement, ValidComponent } from "solid-js";
import classNames from "classnames";
import { DropdownMenu } from "@kobalte/core";

interface DropdownContentProps {
	options?: {
		as?: ValidComponent;
		class?: string;
		rounded?: boolean;
		anchorWidth?: boolean;
	};
	children: JSXElement;
}

const DropdownContent: Component<DropdownContentProps> = (props) => {
	return (
		<DropdownMenu.Portal>
			<DropdownMenu.Content
				as={props.options?.as}
				class={classNames(
					"bg-container-1  border border-border p-15 shadow-md animate-animate-dropdown focus:outline-hidden focus:ring-1 ring-primary-base scrollbar",
					{
						"rounded-md": props.options?.rounded,
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

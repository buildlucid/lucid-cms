import { Dialog } from "@kobalte/core";
import classNames from "classnames";
import { type Component, type JSXElement, Show } from "solid-js";

export interface DrawerDescriptionProps {
	icon?: JSXElement;
	class?: string;
	children: JSXElement;
}

/** The drawer's description, announced by screen readers with the title. */
export const DrawerDescription: Component<DrawerDescriptionProps> = (props) => {
	// ------------------------------
	// Render
	return (
		<Dialog.Description
			data-drawer-description
			class={classNames(
				"mt-1 flex items-start gap-2 pe-16 text-sm text-body",
				props.class,
			)}
		>
			<Show when={props.icon}>
				<span class="mt-1.5 text-warning">{props.icon}</span>
			</Show>
			<span>{props.children}</span>
		</Dialog.Description>
	);
};

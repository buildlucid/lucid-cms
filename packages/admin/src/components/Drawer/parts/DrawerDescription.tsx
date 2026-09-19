import { Dialog } from "@kobalte/core";
import classNames from "classnames";
import { type Component, type JSXElement, Show } from "solid-js";

export interface DrawerDescriptionProps {
	/** Shown before the text, for a warning or status marker. */
	icon?: JSXElement;
	class?: string;
	children: JSXElement;
}

/**
 * A sentence under the title explaining what the drawer does. Screen readers
 * announce it alongside the title.
 *
 * @example
 * ```tsx
 * import { Drawer } from "@lucidcms/admin/components";
 *
 * return <Drawer.Description>This role is managed in config.</Drawer.Description>;
 * ```
 */
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
				<span class="mt-1.5 text-warning-base">{props.icon}</span>
			</Show>
			<span>{props.children}</span>
		</Dialog.Description>
	);
};

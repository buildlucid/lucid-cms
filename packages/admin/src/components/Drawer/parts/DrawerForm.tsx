import classNames from "classnames";
import type { Component, JSXElement } from "solid-js";

export interface DrawerFormProps {
	/** Left off for a read only drawer that still wants the footer pinned down. */
	onSubmit?: () => void;
	class?: string;
	children: JSXElement;
}

/**
 * Wraps the body and footer in a form, so a submit button in Drawer.Actions
 * saves the drawer. Use it instead of your own form element to keep the footer
 * pinned to the bottom.
 *
 * @example
 * ```tsx
 * import { Button, Drawer } from "@lucidcms/admin/components";
 *
 * return (
 * 	<Drawer.Form onSubmit={() => save.mutate(values())}>
 * 		<Drawer.Body>{fields}</Drawer.Body>
 * 		<Drawer.Footer>
 * 			<Drawer.Actions>
 * 				<Button type="submit" loading={save.isPending}>Save</Button>
 * 			</Drawer.Actions>
 * 		</Drawer.Footer>
 * 	</Drawer.Form>
 * );
 * ```
 */
export const DrawerForm: Component<DrawerFormProps> = (props) => {
	// ------------------------------
	// Render
	return (
		<form
			data-drawer-form
			class={classNames("grow flex flex-col justify-between", props.class)}
			onSubmit={(event) => {
				event.preventDefault();
				props.onSubmit?.();
			}}
		>
			{props.children}
		</form>
	);
};

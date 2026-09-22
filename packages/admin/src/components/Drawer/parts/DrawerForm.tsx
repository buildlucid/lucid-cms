import classNames from "classnames";
import type { Component, JSXElement } from "solid-js";

export interface DrawerFormProps {
	onSubmit?: () => void;
	class?: string;
	children: JSXElement;
}

/** Wraps the body and footer in a form, keeping the footer at the bottom. */
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

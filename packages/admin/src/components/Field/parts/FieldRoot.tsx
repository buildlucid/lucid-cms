import type { ErrorResult, FieldError } from "@types";
import classnames from "classnames";
import {
	type Component,
	createMemo,
	createSignal,
	type JSXElement,
} from "solid-js";
import { FieldContext } from "../FieldContext";

export interface FieldRootProps {
	/** Must match the control's id. */
	id: string;
	required?: boolean;
	disabled?: boolean;
	errors?: ErrorResult | FieldError;
	class?: string;
	children: JSXElement;
}

/** Wraps the control and its parts, and holds the field's shared state. */
export const FieldRoot: Component<FieldRootProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [focused, setFocused] = createSignal(false);

	// ----------------------------------------
	// Memos
	const id = createMemo(() => props.id);
	const required = createMemo(() => props.required);
	const disabled = createMemo(() => props.disabled);
	const errors = createMemo(() => props.errors);

	// ----------------------------------------
	// Render
	return (
		<div
			data-field
			class={classnames("group relative", props.class)}
			onFocusIn={() => setFocused(true)}
			onFocusOut={() => setFocused(false)}
		>
			<FieldContext.Provider
				value={{ id, required, disabled, errors, focused }}
			>
				{props.children}
			</FieldContext.Provider>
		</div>
	);
};

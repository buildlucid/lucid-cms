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
	/** Ties the label, description and errors to the control. */
	id: string;
	required?: boolean;
	disabled?: boolean;
	errors?: ErrorResult | FieldError;
	class?: string;
	children: JSXElement;
}

/**
 * Wraps a control with the label, description and errors the admin uses on
 * every field. Reach for it when you are building a control we do not ship;
 * for a text input, select or switch, use those components directly.
 *
 * @example
 * ```tsx
 * import { Field } from "@lucidcms/admin/components";
 *
 * return (
 * 	<Field.Root id="brand-colour" required errors={errors()}>
 * 		<Field.Label>Brand colour</Field.Label>
 * 		<input id="brand-colour" type="color" value={colour()} onInput={onInput} />
 * 		<Field.Description>Used across the public site.</Field.Description>
 * 		<Field.Error />
 * 	</Field.Root>
 * );
 * ```
 */
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

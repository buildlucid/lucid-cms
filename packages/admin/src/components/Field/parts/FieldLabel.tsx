import type { Component, JSXElement } from "solid-js";
import { FormLabel } from "@/components/FormLabel/FormLabel";
import { useFieldContext } from "../FieldContext";

export interface FieldLabelProps {
	/** Before the label text, for an icon or badge. */
	start?: JSXElement;
	/** After the label, against the right edge. */
	end?: JSXElement;
	class?: string;
	children: JSXElement;
}

/**
 * Names the field's control. It marks itself required and highlights while
 * the control has focus, both read from Field.Root.
 *
 * @example
 * ```tsx
 * import { Field } from "@lucidcms/admin/components";
 *
 * return <Field.Label>Brand colour</Field.Label>;
 * ```
 */
export const FieldLabel: Component<FieldLabelProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const { id, required, focused } = useFieldContext();

	// ----------------------------------------
	// Render
	return (
		<FormLabel
			id={id()}
			label={props.children}
			focused={focused()}
			required={required()}
			theme="basic"
			startSlot={props.start}
			rightSlot={props.end}
			class={props.class}
		/>
	);
};

import type { Component, JSXElement } from "solid-js";
import { FormLabel } from "@/components/FormLabel/FormLabel";
import { useFieldContext } from "../FieldContext";

export interface FieldLabelProps {
	start?: JSXElement;
	end?: JSXElement;
	class?: string;
	children: JSXElement;
}

/** The field's label. */
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

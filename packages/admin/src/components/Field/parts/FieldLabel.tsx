import type { Component, JSXElement } from "solid-js";
import { FormLabel } from "@/components/FormLabel/FormLabel";
import { useFieldContext } from "../FieldContext";

export interface FieldLabelProps {
	start?: JSXElement;
	end?: JSXElement;
	class?: string;
	/** Defaults to the label of the field passed to Field.Root. */
	children?: JSXElement;
}

/** The field's label, with the built-in input's markers when a field slot replaces it. */
export const FieldLabel: Component<FieldLabelProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const { id, required, focused, field, markers } = useFieldContext();

	// ----------------------------------------
	// Render
	return (
		<FormLabel
			id={id()}
			label={props.children ?? field()?.label}
			focused={focused()}
			required={required()}
			theme="basic"
			markers={markers() !== undefined}
			localised={markers()?.localised}
			altLocaleError={markers()?.altLocaleError}
			fieldColumnIsMissing={markers()?.fieldColumnIsMissing}
			startSlot={props.start}
			rightSlot={props.end}
			class={props.class}
		/>
	);
};

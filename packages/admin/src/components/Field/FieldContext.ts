import type { ErrorResult, FieldError } from "@types";
import { type Accessor, createContext, useContext } from "solid-js";
import type { FieldLabelMarkersProps } from "@/components/FieldLabelMarkers/FieldLabelMarkers";
import type { EditorField } from "@/extensions/editor/types";

export interface FieldContextValue {
	id: Accessor<string>;
	required: Accessor<boolean | undefined>;
	disabled: Accessor<boolean | undefined>;
	errors: Accessor<ErrorResult | FieldError | FieldError[] | undefined>;
	/** True while focus sits anywhere inside the field. */
	focused: Accessor<boolean>;
	/** A field slot's field, which gives the label and description their text. */
	field: Accessor<EditorField | undefined>;
	/** The built-in input's label markers, when the field slot replaces it. */
	markers: Accessor<FieldLabelMarkersProps | undefined>;
}

export const FieldContext = createContext<FieldContextValue>();

/** Label markers for the field a `field.input` slot replaces, so `Field.Label` can show them. */
export const FieldMarkersContext = createContext<{
	key: string;
	markers: Accessor<FieldLabelMarkersProps>;
}>();

/** Reads the state Field.Root shares with its parts. */
export const useFieldContext = (): FieldContextValue => {
	const context = useContext(FieldContext);
	if (!context) {
		throw new Error("Field parts must be rendered inside <Field.Root>.");
	}
	return context;
};

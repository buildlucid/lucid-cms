import type { ErrorResult, FieldError } from "@types";
import { type Accessor, createContext, useContext } from "solid-js";

export interface FieldContextValue {
	id: Accessor<string>;
	required: Accessor<boolean | undefined>;
	disabled: Accessor<boolean | undefined>;
	errors: Accessor<ErrorResult | FieldError | undefined>;
	/** True while focus sits anywhere inside the field. */
	focused: Accessor<boolean>;
}

export const FieldContext = createContext<FieldContextValue>();

/** Reads the state Field.Root shares with its parts. */
export const useFieldContext = (): FieldContextValue => {
	const context = useContext(FieldContext);
	if (!context) {
		throw new Error("Field parts must be rendered inside <Field.Root>.");
	}
	return context;
};

import type { ErrorResult, FieldError } from "@types";
import classnames from "classnames";
import {
	type Component,
	createMemo,
	createSignal,
	type JSXElement,
	useContext,
} from "solid-js";
import type { EditorField } from "@/extensions/editor/types";
import { FieldContext, FieldMarkersContext } from "../FieldContext";

export type FieldRootProps = {
	class?: string;
	children: JSXElement;
} & (
	| {
			/** Must match the control's id. */
			id: string;
			required?: boolean;
			disabled?: boolean;
			errors?: ErrorResult | FieldError;
			field?: undefined;
	  }
	| {
			/** Field state supplying control attributes, errors, label and description. */
			field: EditorField;
			id?: undefined;
			required?: undefined;
			disabled?: undefined;
			errors?: undefined;
	  }
);

/** Wraps the control and its parts, and holds the field's shared state. */
export const FieldRoot: Component<FieldRootProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [focused, setFocused] = createSignal(false);
	const slotMarkers = useContext(FieldMarkersContext);

	// ----------------------------------------
	// Memos
	const field = createMemo(() => props.field);
	const id = createMemo(() => props.field?.id ?? props.id ?? "");
	const required = createMemo(() => props.field?.required ?? props.required);
	const disabled = createMemo(() => props.field?.readOnly ?? props.disabled);
	const errors = createMemo(
		(): ErrorResult | FieldError | FieldError[] | undefined => {
			const current = props.field;
			if (!current) return props.errors;
			if (current.errors.length === 0) return undefined;

			return current.errors.map((message) => ({
				key: current.key,
				localeCode: null,
				message: { type: "lucid.literal", value: message },
			}));
		},
	);
	const markers = createMemo(() =>
		props.field && slotMarkers?.key === props.field.key
			? slotMarkers.markers()
			: undefined,
	);

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
				value={{ id, required, disabled, errors, focused, field, markers }}
			>
				{props.children}
			</FieldContext.Provider>
		</div>
	);
};

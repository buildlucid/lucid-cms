import { type Component, Show } from "solid-js";
import { FieldDescription as FieldDescriptionText } from "@/components/FieldDescription/FieldDescription";
import {
	normalizeFieldErrors,
	resolveFieldErrorMessage,
} from "@/utils/error-helpers";
import { getFieldError } from "@/utils/get-field-error";
import { useFieldContext } from "../FieldContext";

export interface FieldDescriptionProps {
	class?: string;
	children: string;
}

/** Help text for the field, linked to the control for screen readers. */
export const FieldDescription: Component<FieldDescriptionProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const { id, errors } = useFieldContext();

	// ----------------------------------------
	// Derived State
	const repeatedByError = () => {
		const description = props.children?.trim();
		if (!description) return false;
		const fieldErrors = normalizeFieldErrors(errors());
		const messages = fieldErrors.length
			? fieldErrors.map((error) => resolveFieldErrorMessage(error.message))
			: [getFieldError(errors())];
		return messages.some((message) => message?.trim() === description);
	};

	// ----------------------------------------
	// Render
	return (
		<Show
			when={!repeatedByError()}
			fallback={
				<span id={`${id()}-description`} class="sr-only">
					{props.children}
				</span>
			}
		>
			<FieldDescriptionText
				id={id()}
				describedBy={props.children}
				class={props.class}
			/>
		</Show>
	);
};

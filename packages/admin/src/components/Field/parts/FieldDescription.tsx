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
	/** Defaults to the description of the field passed to Field.Root. */
	children?: string;
}

/** Help text for the field, linked to the control for screen readers. Renders nothing without text. */
export const FieldDescription: Component<FieldDescriptionProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const { id, errors, field } = useFieldContext();

	// ----------------------------------------
	// Derived State
	const text = () => props.children ?? field()?.description;
	const repeatedByError = () => {
		const description = text()?.trim();
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
		<Show when={text()}>
			{(text) => (
				<Show
					when={!repeatedByError()}
					fallback={
						<span id={`${id()}-description`} class="sr-only">
							{text()}
						</span>
					}
				>
					<FieldDescriptionText
						id={id()}
						describedBy={text()}
						class={props.class}
					/>
				</Show>
			)}
		</Show>
	);
};

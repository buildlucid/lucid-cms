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
	/** Plain text, so it can be compared against the error and read out. */
	children: string;
}

/**
 * Explains the field under its control, and is read out with it. It hides
 * itself when an error already says the same thing, staying available to
 * screen readers.
 *
 * @example
 * ```tsx
 * import { Field } from "@lucidcms/admin/components";
 *
 * return <Field.Description>Used across the public site.</Field.Description>;
 * ```
 */
export const FieldDescription: Component<FieldDescriptionProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const { id, errors } = useFieldContext();

	// ----------------------------------------
	// Derived State
	/** Avoids showing the same sentence twice as both help and error. */
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

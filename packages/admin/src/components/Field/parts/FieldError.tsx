import { type Component, Show } from "solid-js";
import { FormErrorMessage } from "@/components/FormErrorMessage/FormErrorMessage";
import { useFieldContext } from "../FieldContext";

export interface FieldErrorProps {
	class?: string;
}

/**
 * Lists the validation errors held by Field.Root. Renders nothing when the
 * field is valid.
 *
 * @example
 * ```tsx
 * import { Field } from "@lucidcms/admin/components";
 *
 * return <Field.Error />;
 * ```
 */
export const FieldError: Component<FieldErrorProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const { id, errors } = useFieldContext();

	// ----------------------------------------
	// Render
	return (
		<Show when={errors() !== undefined}>
			<div data-field-error class={props.class}>
				<FormErrorMessage id={id()} errors={errors()} />
			</div>
		</Show>
	);
};

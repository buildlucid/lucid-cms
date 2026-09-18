import { type Component, type ComponentProps, Show } from "solid-js";
import { FieldDescription } from "@/components/FieldDescription/FieldDescription";
import { FormErrorMessage } from "@/components/FormErrorMessage/FormErrorMessage";
import {
	normalizeFieldErrors,
	resolveFieldErrorMessage,
} from "@/utils/error-helpers";
import { getFieldError } from "@/utils/get-field-error";

/** Prioritizes errors and avoids displaying an identical instruction twice. */
export const FieldFeedback: Component<
	ComponentProps<typeof FormErrorMessage> & {
		describedBy?: string;
	}
> = (props) => {
	// ----------------------------------
	// Derived State
	const repeatedDescription = () => {
		const description = props.describedBy?.trim();
		if (!description) return false;

		const errors = normalizeFieldErrors(props.errors);
		const messages = errors.length
			? errors.map((error) => resolveFieldErrorMessage(error.message))
			: [getFieldError(props.errors)];

		return messages.some((message) => message?.trim() === description);
	};

	// ----------------------------------
	// Render
	return (
		<>
			<FormErrorMessage id={props.id} errors={props.errors} />
			{/* Keep the description available to aria-describedby when its copy matches the error. */}
			<Show
				when={!repeatedDescription()}
				fallback={
					<span id={`${props.id}-description`} class="sr-only">
						{props.describedBy}
					</span>
				}
			>
				<FieldDescription id={props.id} describedBy={props.describedBy} />
			</Show>
		</>
	);
};

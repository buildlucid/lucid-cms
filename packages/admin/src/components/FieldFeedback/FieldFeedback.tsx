import { type Component, type ComponentProps, Show } from "solid-js";
import { FormErrorMessage } from "@/components/FormErrorMessage/FormErrorMessage";

/**
 * A field's errors, and its description for screen readers. Pass the same description to the
 * field's `FormLabel`, which shows it as a tooltip.
 */
export const FieldFeedback: Component<
	ComponentProps<typeof FormErrorMessage> & {
		describedBy?: string;
	}
> = (props) => {
	// ----------------------------------
	// Render
	return (
		<>
			<FormErrorMessage id={props.id} errors={props.errors} />
			<Show when={props.describedBy}>
				<span id={`${props.id}-description`} class="sr-only">
					{props.describedBy}
				</span>
			</Show>
		</>
	);
};

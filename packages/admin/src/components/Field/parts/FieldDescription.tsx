import { type Component, createEffect, onCleanup, Show } from "solid-js";
import { FieldDescription as FieldDescriptionText } from "@/components/FieldDescription/FieldDescription";
import { useFieldContext } from "../FieldContext";

export interface FieldDescriptionProps {
	class?: string;
	/** Defaults to the description of the field passed to Field.Root. */
	children?: string;
}

/**
 * Help text for the field, linked to the control for screen readers. `Field.Label` shows it as a
 * tooltip, and it only shows beneath the control when there's no label. Renders nothing without text.
 */
export const FieldDescription: Component<FieldDescriptionProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const { id, field, setDescription, labelled } = useFieldContext();

	// ----------------------------------------
	// Derived State
	const text = () => props.children ?? field()?.description;

	// ----------------------------------------
	// Effects
	createEffect(() => setDescription(text() || undefined));
	onCleanup(() => setDescription(undefined));

	// ----------------------------------------
	// Render
	return (
		<Show when={text()}>
			{(text) => (
				<Show
					when={labelled()}
					fallback={
						<FieldDescriptionText
							id={id()}
							describedBy={text()}
							class={props.class}
						/>
					}
				>
					<span id={`${id()}-description`} class="sr-only">
						{text()}
					</span>
				</Show>
			)}
		</Show>
	);
};

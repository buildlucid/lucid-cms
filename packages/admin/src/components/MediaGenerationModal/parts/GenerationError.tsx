import { type Component, Show } from "solid-js";

/** An error shown under a generation form, such as a failed request. */
const GenerationError: Component<{
	message?: string;
}> = (props) => {
	// -----------------------------
	// Render
	return (
		<Show when={props.message}>
			{(message) => (
				<div class="min-w-0 rounded-md border border-danger-low-border bg-danger-low p-3">
					<p class="text-sm text-danger-low-foreground">{message()}</p>
				</div>
			)}
		</Show>
	);
};

export default GenerationError;

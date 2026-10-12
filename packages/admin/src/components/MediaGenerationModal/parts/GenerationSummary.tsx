import { type Component, Show } from "solid-js";
import { FieldDescription } from "@/components/FieldDescription/FieldDescription";
import type { MediaGenerationSettings } from "../types";
import { generationSummary } from "../utils/generation-details";

/** The instruction or script a generation was made from, clamped to two lines. */
const GenerationSummary: Component<{
	id: string;
	settings: MediaGenerationSettings;
}> = (props) => {
	// -----------------------------
	// Render
	return (
		<Show when={generationSummary(props.settings)}>
			{(summary) => (
				<div class="min-w-0 rounded-lg border border-border bg-background p-3">
					<FieldDescription
						id={props.id}
						describedBy={summary()}
						class="whitespace-pre-line text-body"
					/>
				</div>
			)}
		</Show>
	);
};

export default GenerationSummary;

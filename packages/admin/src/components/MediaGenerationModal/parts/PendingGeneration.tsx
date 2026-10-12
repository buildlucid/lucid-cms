import { TbOutlineRotate, TbOutlineX } from "solid-icons/tb";
import { type Component, Show } from "solid-js";
import AudioPill from "@/components/AudioPill/AudioPill";
import Button from "@/components/Button/Button";
import DetailsList from "@/components/DetailsList/DetailsList";
import GeneratingImage from "@/components/GeneratingImage/GeneratingImage";
import T from "@/translations";
import type { WorkingMediaGeneration } from "../types";
import { generationDetails } from "../utils/generation-details";
import GenerationSummary from "./GenerationSummary";

/** Shows a pending generation with resume and discard actions when resumable. */
const PendingGeneration: Component<{
	generation: WorkingMediaGeneration;
	/** Animates the preview while sending or polling, otherwise showing the waiting state. */
	loading: boolean;
	resumable: boolean;
	onResume: () => void;
	onDiscard: () => void;
}> = (props) => {
	// -----------------------------
	// Render
	return (
		<div class="min-w-0 space-y-3">
			<Show
				when={props.generation.settings.type === "image"}
				fallback={<AudioPill class="w-full" paused={!props.loading} />}
			>
				<GeneratingImage paused={!props.loading} />
			</Show>
			<div class="space-y-3">
				<GenerationSummary
					id={`ai-media-generation-summary-${props.generation.id}`}
					settings={props.generation.settings}
				/>
				<div class="min-w-0 rounded-lg border border-border bg-background p-3">
					<DetailsList
						variant="plain"
						items={generationDetails(props.generation.settings)}
					/>
				</div>
				<Show when={props.resumable}>
					<div class="flex min-w-0 flex-wrap gap-2">
						<Button
							type="button"
							variant="outline"
							size="sm"
							class="gap-2"
							disabled={props.loading}
							onClick={() => props.onResume()}
						>
							<TbOutlineRotate size={12} aria-hidden="true" />
							{T()("ai.media.generate.response.inflight.resume")}
						</Button>
						<Button
							type="button"
							variant="danger-outline"
							size="sm"
							class="gap-2"
							disabled={props.loading}
							onClick={() => props.onDiscard()}
						>
							<TbOutlineX size={12} aria-hidden="true" />
							{T()("ai.media.generate.response.inflight.discard")}
						</Button>
					</div>
				</Show>
			</div>
		</div>
	);
};

export default PendingGeneration;

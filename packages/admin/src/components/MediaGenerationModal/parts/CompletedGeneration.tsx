import { TbOutlinePhoto, TbOutlineRotate } from "solid-icons/tb";
import { type Component, Match, Show, Switch } from "solid-js";
import AudioPill from "@/components/AudioPill/AudioPill";
import Button from "@/components/Button/Button";
import DetailsList from "@/components/DetailsList/DetailsList";
import T from "@/translations";
import type { MediaGenerationCandidate } from "../types";
import { generationDetails } from "../utils/generation-details";
import GenerationSummary from "./GenerationSummary";

/** A finished generation's preview, what it was asked for, and what to do next. */
const CompletedGeneration: Component<{
	generation: MediaGenerationCandidate;
	loading: boolean;
	onRetry: () => void;
	/** Shown for images, to edit the result further. */
	onUseAsSource?: () => void;
}> = (props) => {
	// -----------------------------
	// Render
	return (
		<div class="min-w-0 space-y-3">
			<Switch>
				<Match
					when={
						props.generation.result.type === "image" && props.generation.result
					}
				>
					{(result) => (
						<div class="rectangle-background relative flex min-h-72 w-full items-center justify-center overflow-hidden rounded-md border border-border bg-card">
							<img
								src={result().output.url}
								alt=""
								class="relative z-10 h-full max-h-96 w-full object-contain p-4"
							/>
						</div>
					)}
				</Match>
				<Match
					when={
						props.generation.result.type === "audio" && props.generation.result
					}
				>
					{(result) => (
						<AudioPill
							src={result().output.url}
							label={
								props.generation.settings.type === "audio"
									? props.generation.settings.voiceName
									: props.generation.settings.modelName
							}
							class="w-full"
						/>
					)}
				</Match>
			</Switch>
			<div class="space-y-3">
				<GenerationSummary
					id={`ai-media-generation-summary-${props.generation.id}`}
					settings={props.generation.settings}
				/>
				<div class="min-w-0 rounded-lg border border-border bg-background p-3">
					<DetailsList
						variant="plain"
						items={generationDetails(
							props.generation.settings,
							props.generation.result,
						)}
					/>
				</div>
				<div class="flex min-w-0 flex-wrap gap-2">
					<Show when={props.onUseAsSource}>
						{(useAsSource) => (
							<Button
								type="button"
								variant="secondary"
								size="sm"
								class="gap-2"
								onClick={() => useAsSource()()}
							>
								<TbOutlinePhoto size={12} aria-hidden="true" />
								{T()("ai.media.image.generate.source.use")}
							</Button>
						)}
					</Show>
					<Button
						type="button"
						variant="outline"
						size="sm"
						class="gap-2"
						disabled={props.loading}
						onClick={() => props.onRetry()}
					>
						<TbOutlineRotate size={12} aria-hidden="true" />
						{T()("ai.media.generate.response.retry")}
					</Button>
				</div>
			</div>
		</div>
	);
};

export default CompletedGeneration;

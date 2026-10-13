import { type Component, createMemo, Show } from "solid-js";
import AiGenerationHistory, {
	type AiGenerationHistoryItem,
} from "@/components/AiGenerationHistory/AiGenerationHistory";
import T from "@/translations";
import helpers from "@/utils/helpers";
import type {
	MediaGenerationCandidate,
	PendingMediaGeneration,
	WorkingMediaGeneration,
} from "../types";
import { generationNumber } from "../utils/generation-helpers";

/** Lists the session's generations, followed by the one being sent or worked on. */
const GenerationHistory: Component<{
	generations: MediaGenerationCandidate[];
	working?: WorkingMediaGeneration;
	pending?: PendingMediaGeneration;
	/** Shows the pending generation as generating rather than waiting to resume. */
	polling: boolean;
	activeItemId?: string;
	onSelect: (id: string) => void;
}> = (props) => {
	// -----------------------------
	// Memos
	const items = createMemo<AiGenerationHistoryItem[]>(() => {
		const completed = props.generations.map((generation, index) => ({
			id: generation.id,
			label: generationLabel(index),
			meta: generationMeta(generation),
		}));
		const working = props.working;
		if (working) {
			return [
				...completed,
				{
					id: working.id,
					label: generationLabelFromId(working.id, completed.length),
					meta: T()("ai.media.generate.history.generating.meta"),
				},
			];
		}

		const pending = props.pending;
		if (!pending) return completed;

		return [
			...completed,
			{
				id: pending.id,
				label: generationLabelFromId(pending.id, completed.length),
				meta: props.polling
					? T()("ai.media.generate.history.generating.meta")
					: T()("ai.media.generate.response.inflight.title"),
			},
		];
	});

	// -----------------------------
	// Functions
	function generationLabel(index: number) {
		return T()("ai.media.generate.response.item.label", {
			count: index + 1,
		});
	}
	function generationLabelFromId(id: string, fallbackIndex: number) {
		const numericId = generationNumber(id);
		if (Number.isFinite(numericId) && numericId > 0) {
			return generationLabel(numericId - 1);
		}
		return generationLabel(fallbackIndex);
	}
	function generationMeta(generation: MediaGenerationCandidate) {
		const { result, settings } = generation;
		const details =
			result.type === "image"
				? [result.output.aspectRatio, result.output.resolution]
				: [settings.type === "audio" ? settings.voiceName : ""];

		return [...details, helpers.bytesToSize(result.output.byteSize)]
			.filter(Boolean)
			.join(" · ");
	}

	// -----------------------------
	// Render
	return (
		<Show when={items().length > 0}>
			<AiGenerationHistory
				id="ai-media-generation-history"
				items={items()}
				activeItemId={props.activeItemId}
				onSelect={props.onSelect}
			/>
		</Show>
	);
};

export default GenerationHistory;

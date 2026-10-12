import type { ErrorResultObj, MediaGenerationModels } from "@types";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	type JSXElement,
	on,
	Show,
} from "solid-js";
import Textarea from "@/components/Textarea/Textarea";
import VoiceSelect from "@/components/VoiceSelect/VoiceSelect";
import T from "@/translations";
import type { AudioGenerationValues } from "../types";
import GenerationError from "./GenerationError";
import PromptField from "./PromptField";

/** Edits the voice, delivery instructions and speech script. */
const AudioGenerationForm: Component<{
	model?: MediaGenerationModels["audio"];
	loading: boolean;
	disabled: boolean;
	error?: string;
	scriptError?: ErrorResultObj;
	/** The model picker, shown beside the send button. */
	modelPicker: JSXElement;
	/** Called whenever a value changes, so a new request gets a new idempotency key. */
	onChange: () => void;
	onGenerate: (_values: AudioGenerationValues) => void;
}> = (props) => {
	// -----------------------------
	// State & Hooks
	const [script, setScript] = createSignal("");
	const [instruction, setInstruction] = createSignal("");
	const [voice, setVoice] = createSignal<string>();

	// -----------------------------
	// Memos
	const maxCharacters = createMemo(() => props.model?.maxCharacters ?? 20_000);
	const tooLong = createMemo(() => script().trim().length > maxCharacters());
	const canGenerate = createMemo(
		() =>
			!props.disabled &&
			props.model !== undefined &&
			voice() !== undefined &&
			script().trim().length > 0 &&
			!tooLong(),
	);

	// -----------------------------
	// Functions
	const submit = (event?: SubmitEvent) => {
		event?.preventDefault();
		const selectedVoice = voice();
		if (!canGenerate() || !selectedVoice) return;

		const trimmed = instruction().trim();
		props.onGenerate({
			script: script().trim(),
			instruction:
				props.model?.instructions && trimmed.length > 0 ? trimmed : undefined,
			voice: selectedVoice,
		});
	};

	// -----------------------------
	// Effects
	createEffect(
		on(
			() => [script(), instruction(), voice()],
			() => props.onChange(),
			{ defer: true },
		),
	);
	createEffect(() => {
		const model = props.model;
		if (!model) return;
		if (!model.voices.some((option) => option.id === voice())) {
			setVoice(model.defaultVoice);
		}
	});

	// -----------------------------
	// Render
	return (
		<form class="flex min-w-0 flex-col gap-3" onSubmit={submit}>
			<VoiceSelect
				id="ai-media-audio-generation-voice"
				name="ai-media-audio-generation-voice"
				voices={props.model?.voices ?? []}
				value={voice()}
				onChange={setVoice}
				disabled={!props.model}
			/>
			<Show when={props.model?.instructions}>
				<Textarea
					id="ai-media-audio-generation-instruction"
					name="ai-media-audio-generation-instruction"
					value={instruction()}
					onChange={setInstruction}
					label={T()("ai.generation.instruction.label")}
					placeholder={T()("ai.media.audio.generate.instruction.placeholder")}
					rows={3}
				/>
			</Show>
			<PromptField
				id="ai-media-audio-generation-script"
				name="ai-media-audio-generation-script"
				value={script()}
				onChange={setScript}
				label={T()("ai.media.audio.generate.script.label")}
				placeholder={T()("ai.media.audio.generate.script.placeholder")}
				hint={T()("ai.media.audio.generate.script.count", {
					count: script().trim().length,
					max: maxCharacters(),
				})}
				rows={12}
				invalid={tooLong()}
				errors={props.scriptError}
				toolbar={props.modelPicker}
				submitDisabled={!canGenerate()}
				onSubmit={submit}
			/>
			<GenerationError message={props.error} />
		</form>
	);
};

export default AudioGenerationForm;

import type { MediaGenerationVoice } from "@types";
import { TbOutlinePlayerPlay, TbOutlinePlayerStop } from "solid-icons/tb";
import { type Component, createMemo, createSignal, onCleanup } from "solid-js";
import Select from "@/components/Select/Select";
import T, { getLocale } from "@/translations";
import {
	claimAudioPlayback,
	releaseAudioPlayback,
} from "@/utils/audio-playback";

type VoiceOption = { value: string; label: string; previewUrl: string };

const SEARCH_THRESHOLD = 12;

/** Selects a speech voice with sample playback on highlight or through the label button. */
const VoiceSelect: Component<{
	id: string;
	name: string;
	voices: MediaGenerationVoice[];
	value?: string;
	onChange: (_value: string) => void;
	disabled?: boolean;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [playing, setPlaying] = createSignal<string>();
	const [search, setSearch] = createSignal("");
	let audio: HTMLAudioElement | undefined;

	// ----------------------------------------
	// Memos
	const languageNames = createMemo(
		() => new Intl.DisplayNames([getLocale()], { type: "language" }),
	);
	const options = createMemo<VoiceOption[]>(() =>
		props.voices.map((voice) => ({
			value: voice.id,
			label: voice.language
				? `${voice.name} · ${languageName(voice.language)}`
				: voice.name,
			previewUrl: voice.previewUrl,
		})),
	);
	const selected = createMemo(() =>
		options().find((option) => option.value === props.value),
	);
	const previewLabel = createMemo(() =>
		T()(
			playing() === undefined
				? "ai.media.audio.generate.voice.preview.play"
				: "ai.media.audio.generate.voice.preview.stop",
		),
	);
	//* the selected voice stays listed, so the trigger keeps its label while searching
	const filteredOptions = createMemo(() => {
		const query = search().trim().toLocaleLowerCase();
		return query
			? options().filter(
					(option) =>
						option.value === props.value ||
						option.label.toLocaleLowerCase().includes(query),
				)
			: options();
	});

	// ----------------------------------------
	// Functions
	function languageName(tag: string) {
		try {
			return languageNames().of(tag) ?? tag;
		} catch {
			return tag;
		}
	}
	/** Creates the shared preview element and registers playback to pause other audio. */
	const previewAudio = () => {
		const element = new Audio();
		element.onplay = () => claimAudioPlayback(element);
		//* Ignore delayed pause events after another preview starts playing.
		element.onpause = () => {
			if (element.paused) setPlaying(undefined);
		};
		element.onended = () => setPlaying(undefined);
		return element;
	};
	const stop = () => {
		audio?.pause();
		setPlaying(undefined);
	};
	const play = (option: VoiceOption) => {
		stop();
		audio ??= previewAudio();
		const element = audio;
		element.src = option.previewUrl;
		setPlaying(option.value);
		//* A rejected play must not clear a later preview that is already playing.
		element.play().catch(() => {
			if (element.paused) setPlaying(undefined);
		});
	};

	// ----------------------------------------
	// Effects
	onCleanup(() => {
		if (audio) releaseAudioPlayback(audio);
	});

	// ----------------------------------------
	// Render
	return (
		<Select
			id={props.id}
			name={props.name}
			value={props.value}
			onChange={(value) => {
				if (typeof value === "string") props.onChange(value);
			}}
			options={filteredOptions()}
			search={
				options().length > SEARCH_THRESHOLD
					? { value: search(), onChange: setSearch }
					: undefined
			}
			onHighlight={(option) => (option ? play(option) : stop())}
			label={T()("ai.media.audio.generate.voice.label")}
			labelEnd={
				<button
					type="button"
					class="relative flex size-5 items-center justify-center rounded-md text-muted transition-colors duration-200 before:absolute before:-inset-1 before:rounded-md before:content-[''] hover:text-title focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
					disabled={!selected()}
					aria-label={previewLabel()}
					title={previewLabel()}
					onClick={() => {
						const option = selected();
						if (playing() !== undefined || !option) stop();
						else play(option);
					}}
				>
					{playing() === undefined ? (
						<TbOutlinePlayerPlay size={11} aria-hidden="true" />
					) : (
						<TbOutlinePlayerStop size={11} aria-hidden="true" />
					)}
				</button>
			}
			disabled={props.disabled}
		/>
	);
};

export default VoiceSelect;

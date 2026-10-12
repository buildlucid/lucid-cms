import classnames from "classnames";
import {
	TbFillPlayerPause,
	TbFillPlayerPlay,
	TbOutlineVolume,
	TbOutlineVolumeOff,
} from "solid-icons/tb";
import {
	type Component,
	createMemo,
	createSignal,
	For,
	onCleanup,
	Show,
} from "solid-js";
import T from "@/translations";
import {
	claimAudioPlayback,
	releaseAudioPlayback,
} from "@/utils/audio-playback";
import helpers from "@/utils/helpers";

//* a fixed shape, so every pill reads as audio without decoding the file
const bars = [
	0.35, 0.55, 0.8, 0.5, 0.95, 0.65, 0.4, 0.7, 1, 0.6, 0.45, 0.85, 0.55, 0.3,
	0.7, 0.9, 0.5, 0.65, 0.4, 0.8, 0.6, 0.95, 0.45, 0.7, 0.35, 0.6, 0.85, 0.5,
	0.4, 0.75, 0.55, 0.3,
];
const rates: readonly number[] = [1, 1.5, 2];

const controlClass =
	"flex h-6 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-card-hover hover:text-title focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-primary";

/**
 * Plays audio with compact controls or shows generation progress when `src` is absent.
 * @remarks Callers set the width; `paused` stops generation animation, and playback pauses other registered audio.
 */
const AudioPill: Component<
	{
		/** Starts playing once it can. */
		autoplay?: boolean;
		class?: string;
	} & (
		| { src: string; label: string; paused?: never }
		//* left out while the audio is generating, which shows its own text
		| {
				src?: never;
				label?: never;
				/** Stops generation animation and shows the waiting state. */
				paused?: boolean;
		  }
	)
> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [playing, setPlaying] = createSignal(false);
	const [currentTime, setCurrentTime] = createSignal(0);
	const [duration, setDuration] = createSignal(0);
	const [rate, setRate] = createSignal(1);
	const [muted, setMuted] = createSignal(false);
	let audio: HTMLAudioElement | undefined;

	// ----------------------------------------
	// Memos
	const generating = createMemo(() => props.src === undefined);
	const animating = createMemo(() => generating() && !props.paused);
	const generatingLabel = createMemo(() =>
		props.paused
			? T()("ai.media.generate.response.inflight.title")
			: T()("ai.media.audio.generating"),
	);
	const progress = createMemo(() =>
		duration() > 0 ? currentTime() / duration() : 0,
	);
	const position = createMemo(
		() => helpers.formatMediaDuration(currentTime()) ?? "",
	);
	const total = createMemo(() => helpers.formatMediaDuration(duration()) ?? "");
	//* recorded audio can have no known length until it has played through
	const time = createMemo(() => {
		if (duration() > 0) return `${position()} / ${total()}`;
		return currentTime() > 0 ? position() : undefined;
	});
	const speedLabel = createMemo(() =>
		T()("ai.media.audio.player.speed", { name: props.label, rate: rate() }),
	);
	const muteLabel = createMemo(() =>
		T()(
			muted() ? "ai.media.audio.player.unmute" : "ai.media.audio.player.mute",
			{ name: props.label },
		),
	);

	// ----------------------------------------
	// Functions
	const toggle = () => {
		if (!audio) return;
		if (audio.paused) void audio.play().catch(() => setPlaying(false));
		else audio.pause();
	};
	const cycleRate = () => {
		if (!audio) return;
		const next = rates.find((value) => value > rate()) ?? 1;
		//* the default carries the speed over when the source reloads
		audio.defaultPlaybackRate = next;
		audio.playbackRate = next;
	};

	// ----------------------------------------
	// Render
	return (
		<div
			class={classnames(
				"@container relative flex h-14 min-w-0 items-center gap-3 overflow-hidden rounded-full border border-border bg-card ps-2 pe-4",
				props.class,
			)}
			title={generating() ? generatingLabel() : undefined}
			aria-busy={animating()}
		>
			<Show
				when={props.src}
				fallback={
					<>
						<Show when={animating()}>
							<div
								aria-hidden="true"
								class="skeleton-shimmer pointer-events-none absolute inset-0 opacity-50"
							/>
						</Show>
						<span class="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-input text-muted">
							<TbOutlineVolume
								size={16}
								class={animating() ? "motion-safe:animate-pulse" : undefined}
								aria-hidden="true"
							/>
						</span>
					</>
				}
			>
				{(src) => (
					<>
						{/* biome-ignore lint/a11y/useMediaCaption: the element only drives the custom controls, and a media item's transcript sits with its details */}
						<audio
							ref={(element) => {
								audio = element;
								//* registered with this branch, so the audio stops when the source goes too
								onCleanup(() => releaseAudioPlayback(element));
							}}
							src={src()}
							preload="metadata"
							autoplay={props.autoplay}
							onPlay={(event) => {
								claimAudioPlayback(event.currentTarget);
								setPlaying(true);
							}}
							onPause={() => setPlaying(false)}
							onEnded={() => setPlaying(false)}
							onTimeUpdate={(event) =>
								setCurrentTime(event.currentTarget.currentTime)
							}
							onDurationChange={(event) => {
								const value = event.currentTarget.duration;
								setDuration(Number.isFinite(value) ? value : 0);
							}}
							onRateChange={(event) =>
								setRate(event.currentTarget.playbackRate)
							}
							onVolumeChange={(event) => setMuted(event.currentTarget.muted)}
						/>
						<button
							type="button"
							class="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card"
							aria-label={T()(
								playing()
									? "ai.media.audio.player.pause"
									: "ai.media.audio.player.play",
								{ name: props.label },
							)}
							onClick={toggle}
						>
							<Show when={playing()} fallback={<TbFillPlayerPlay size={14} />}>
								<TbFillPlayerPause size={14} />
							</Show>
						</button>
					</>
				)}
			</Show>
			<div class="relative min-w-0 flex-1">
				<div class="flex items-center justify-between gap-2">
					<p class="truncate text-xs text-title">
						{generating() ? generatingLabel() : props.label}
					</p>
					<Show when={time()}>
						{(value) => (
							<span class="shrink-0 text-[11px] text-muted tabular-nums">
								{value()}
							</span>
						)}
					</Show>
				</div>
				{/* the seek input is invisible, so its focus ring shows on the waveform */}
				<div class="relative mt-1 flex h-4 items-center gap-0.5 rounded-sm has-focus-visible:ring-2 has-focus-visible:ring-primary has-focus-visible:ring-offset-2 has-focus-visible:ring-offset-card">
					<For each={bars}>
						{(height, index) => (
							<span
								aria-hidden="true"
								class={classnames(
									"min-w-0.5 flex-1 rounded-full transition-colors",
									index() / bars.length < progress()
										? "bg-primary"
										: "bg-muted opacity-40",
									{ "motion-safe:animate-wave": animating() },
								)}
								style={{
									height: `${height * 100}%`,
									"animation-delay": `${(index() % 8) * 120}ms`,
								}}
							/>
						)}
					</For>
					<Show when={!generating() && duration() > 0}>
						<input
							type="range"
							min={0}
							max={duration()}
							step={0.1}
							value={currentTime()}
							aria-label={T()("ai.media.audio.player.seek", {
								name: props.label,
							})}
							aria-valuetext={T()("ai.media.audio.player.position", {
								current: position(),
								total: total(),
							})}
							class="absolute inset-0 w-full cursor-pointer opacity-0"
							onInput={(event) => {
								if (audio) {
									audio.currentTime = Number(event.currentTarget.value);
								}
							}}
						/>
					</Show>
				</div>
			</div>
			<Show when={!generating()}>
				{/* hidden on narrow pills, so the waveform keeps its room */}
				<div class="-me-2 hidden shrink-0 items-center gap-0.5 @2xs:flex">
					<button
						type="button"
						class={classnames(
							controlClass,
							"min-w-8 px-1.5 text-[11px] tabular-nums",
						)}
						aria-label={speedLabel()}
						title={speedLabel()}
						onClick={cycleRate}
					>
						{rate()}×
					</button>
					<button
						type="button"
						class={classnames(controlClass, "w-6")}
						aria-label={muteLabel()}
						title={muteLabel()}
						onClick={() => {
							if (audio) audio.muted = !audio.muted;
						}}
					>
						<Show
							when={muted()}
							fallback={<TbOutlineVolume size={14} aria-hidden="true" />}
						>
							<TbOutlineVolumeOff size={14} aria-hidden="true" />
						</Show>
					</button>
				</div>
			</Show>
		</div>
	);
};

export default AudioPill;

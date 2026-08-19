import type {
	MediaPoster,
	MediaPresetSource,
	MediaStatus,
	MediaType,
	MediaVideoSource,
} from "@types";
import {
	FaSolidFile,
	FaSolidFileAudio,
	FaSolidFileLines,
	FaSolidFileVideo,
	FaSolidFileZipper,
	FaSolidPlay,
} from "solid-icons/fa";
import {
	type Component,
	createEffect,
	createSignal,
	For,
	Match,
	onCleanup,
	Show,
	Switch,
} from "solid-js";
import Image from "@/components/Partials/Image";
import MediaStatusPreview from "@/components/Partials/MediaStatusPreview";

interface MediaPreviewProps {
	media: {
		status: MediaStatus;
		type: MediaType;
		url: string;
		presets?: Record<string, MediaPresetSource>;
		sources?: MediaVideoSource[];
		poster?: MediaPoster | null;
	};
	richPreview?: boolean;
	alt: string | null;
	imageFit?: "cover" | "contain";
	preset?: "thumbnail-small" | "thumbnail-medium" | "thumbnail-large";
}

const MediaPreview: Component<MediaPreviewProps> = (props) => {
	// -------------------------------
	// State
	const [renderNativeMedia, setRenderNativeMedia] = createSignal(false);

	// -------------------------------
	// Memos
	const preset = () => props.preset ?? "thumbnail-small";
	const videoSources = () =>
		props.media.sources?.length
			? props.media.sources
			: [
					{
						url: props.media.url,
						mimeType: "",
						kind: "progressive" as const,
					},
				];
	// -------------------------------
	// Effects
	createEffect(() => {
		props.media.status;
		props.media.type;
		props.media.url;
		props.richPreview;

		setRenderNativeMedia(false);
		if (props.media.status !== "ready") return;

		let secondFrame: number | undefined;
		const firstFrame = requestAnimationFrame(() => {
			secondFrame = requestAnimationFrame(() => {
				setRenderNativeMedia(true);
			});
		});

		onCleanup(() => {
			cancelAnimationFrame(firstFrame);
			if (secondFrame !== undefined) cancelAnimationFrame(secondFrame);
		});
	});

	// -------------------------------
	// Render
	return (
		<Show
			when={props.media.status !== "ready"}
			fallback={
				<Switch>
					<Match when={props.media.type === "image"}>
						<Image
							classes={"rounded-t-md backface-hidden z-10 relative"}
							fit={props.imageFit}
							src={props.media.presets?.[preset()]?.url ?? props.media.url}
							alt={props.alt || ""}
							loading="lazy"
						/>
					</Match>
					<Match when={props.media.type === "archive"}>
						<div class="w-full h-full flex justify-center items-center">
							<FaSolidFileZipper size={40} class="text-icon-base opacity-40" />
						</div>
					</Match>
					<Match when={props.media.type === "audio"}>
						<div class={"w-full h-full flex justify-center items-center"}>
							<Switch>
								<Match when={props.richPreview}>
									<Show when={renderNativeMedia()}>
										{/* biome-ignore lint/a11y/useMediaCaption: explanation */}
										<audio
											src={props.media.url}
											class="w-2/3"
											controls
											draggable={false}
											onDragStart={(e) => {
												e.preventDefault();
												e.stopPropagation();
											}}
										/>
									</Show>
								</Match>
								<Match when={!props.richPreview}>
									<FaSolidFileAudio
										size={40}
										class="text-icon-base opacity-40"
									/>
								</Match>
							</Switch>
						</div>
					</Match>
					<Match when={props.media.type === "video"}>
						<div class={"w-full h-full flex justify-center items-center"}>
							<Switch>
								<Match when={props.media.poster}>
									{(poster) => (
										<div class="relative h-full w-full flex items-center justify-center">
											<Image
												classes={"z-10 relative backface-hidden"}
												fit={props.imageFit}
												src={
													poster().file.presets[preset()]?.url ??
													poster().file.url
												}
												alt={props.alt || ""}
												loading="lazy"
											/>
											<div class="absolute inset-0 z-20 flex items-center justify-center">
												<div class="flex h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-black/45 text-white shadow-sm backdrop-blur-xs">
													<FaSolidPlay class="ml-0.5 h-4 w-4" />
												</div>
											</div>
										</div>
									)}
								</Match>
								<Match when={props.richPreview}>
									<Show when={renderNativeMedia()}>
										{/* biome-ignore lint/a11y/useMediaCaption: explanation */}
										<video
											class="w-full h-full object-contain z-10 relative"
											controls
											preload="auto"
											draggable={false}
											onDragStart={(e) => {
												e.preventDefault();
												e.stopPropagation();
											}}
										>
											<For each={videoSources()}>
												{(source) => (
													<source
														src={source.url}
														type={source.mimeType || undefined}
													/>
												)}
											</For>
										</video>
									</Show>
								</Match>
								<Match when={!props.richPreview}>
									<FaSolidFileVideo
										size={40}
										class="text-icon-base opacity-40"
									/>
								</Match>
							</Switch>
						</div>
					</Match>
					<Match when={props.media.type === "document"}>
						<div class="w-full h-full flex justify-center items-center group-hover:scale-110 transition duration-100">
							<FaSolidFileLines size={40} class="text-icon-base opacity-40" />
						</div>
					</Match>
					<Match when={props.media.type === "unknown"}>
						<div class="w-full h-full flex justify-center items-center group-hover:scale-110 transition duration-100">
							<FaSolidFile size={40} class="text-icon-base opacity-40" />
						</div>
					</Match>
				</Switch>
			}
		>
			<MediaStatusPreview status={props.media.status} />
		</Show>
	);
};

export default MediaPreview;

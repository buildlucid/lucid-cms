import type { Media } from "@types";
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
	Match,
	onCleanup,
	Show,
	Switch,
} from "solid-js";
import Image from "@/components/Partials/Image";

interface MediaPreviewProps {
	media: {
		type: Media["type"];
		url: string;
		poster?: Media["poster"];
		updatedAt?: string | null;
	};
	richPreview?: boolean;
	alt: string | null;
	imageFit?: "cover" | "contain";
	preset?: "thumbnail-small" | "thumbnail-medium" | "thumbnail-large";
	cacheKey?: string | number | null;
}

const MediaPreview: Component<MediaPreviewProps> = (props) => {
	// -------------------------------
	// State
	const [renderNativeMedia, setRenderNativeMedia] = createSignal(false);

	// -------------------------------
	// Memos
	const preset = () => props.preset ?? "thumbnail-small";
	const cacheKey = () => props.cacheKey ?? props.media.updatedAt;
	const withCacheKey = (url: string) => {
		const key = cacheKey();
		if (key === undefined || key === null || key === "") return url;

		return `${url}${url.includes("?") ? "&" : "?"}v=${encodeURIComponent(String(key))}`;
	};

	// -------------------------------
	// Effects
	createEffect(() => {
		props.media.type;
		props.media.url;
		props.richPreview;

		setRenderNativeMedia(false);
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
		<Switch>
			<Match when={props.media.type === "image"}>
				<Image
					classes={"rounded-t-md backface-hidden z-10 relative"}
					fit={props.imageFit}
					src={withCacheKey(
						`${props.media.url}?preset=${preset()}&format=webp`,
					)}
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
							<FaSolidFileAudio size={40} class="text-icon-base opacity-40" />
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
										src={withCacheKey(
											`${poster().url}?preset=${preset()}&format=webp`,
										)}
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
									src={props.media.url}
									class="w-full h-full object-contain z-10 relative"
									controls
									preload="auto"
									draggable={false}
									onDragStart={(e) => {
										e.preventDefault();
										e.stopPropagation();
									}}
								/>
							</Show>
						</Match>
						<Match when={!props.richPreview}>
							<FaSolidFileVideo size={40} class="text-icon-base opacity-40" />
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
	);
};

export default MediaPreview;

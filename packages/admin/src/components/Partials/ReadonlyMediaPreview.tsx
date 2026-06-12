import type { Media } from "@types";
import { FaSolidFile } from "solid-icons/fa";
import {
	type Component,
	createEffect,
	createSignal,
	Match,
	onCleanup,
	Show,
	Switch,
} from "solid-js";

const ReadonlyMediaPreview: Component<{
	media: {
		type: Media["type"];
		url: string;
		updatedAt?: string | null;
	};
	alt: string;
}> = (props) => {
	// ------------------------------------
	// State
	const [renderNativeMedia, setRenderNativeMedia] = createSignal(false);

	// ------------------------------------
	// Functions
	const withCacheKey = (url: string) => {
		const key = props.media.updatedAt;
		if (key === undefined || key === null || key === "") return url;

		return `${url}${url.includes("?") ? "&" : "?"}v=${encodeURIComponent(key)}`;
	};

	// ------------------------------------
	// Effects
	createEffect(() => {
		props.media.type;
		props.media.url;

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

	// ------------------------------------
	// Render
	return (
		<div class="w-full border-border border h-80 rounded-md relative overflow-hidden">
			<Switch
				fallback={
					<div class="w-full h-full relative z-10 bg-input-base flex flex-col justify-center items-center">
						<FaSolidFile class="w-10 h-10 mx-auto text-unfocused" />
					</div>
				}
			>
				<Match when={props.media.type === "image"}>
					<div class="w-full h-full relative z-10 p-4 rectangle-background">
						<img
							src={withCacheKey(props.media.url)}
							alt={props.alt}
							class="w-full h-full object-contain z-10 relative"
							draggable={false}
							onDragStart={(e) => {
								e.preventDefault();
								e.stopPropagation();
							}}
						/>
					</div>
				</Match>
				<Match when={props.media.type === "video"}>
					<div class="w-full h-full relative z-10 bg-input-base rectangle-background">
						<Show when={renderNativeMedia()}>
							{/* biome-ignore lint/a11y/useMediaCaption: explanation */}
							<video
								src={withCacheKey(props.media.url)}
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
					</div>
				</Match>
				<Match when={props.media.type === "audio"}>
					<div class="w-full h-full relative z-10 bg-input-base flex justify-center items-center">
						<Show when={renderNativeMedia()}>
							{/* biome-ignore lint/a11y/useMediaCaption: explanation */}
							<audio
								src={withCacheKey(props.media.url)}
								class="w-2/3"
								controls
								draggable={false}
								onDragStart={(e) => {
									e.preventDefault();
									e.stopPropagation();
								}}
							/>
						</Show>
					</div>
				</Match>
			</Switch>
		</div>
	);
};

export default ReadonlyMediaPreview;

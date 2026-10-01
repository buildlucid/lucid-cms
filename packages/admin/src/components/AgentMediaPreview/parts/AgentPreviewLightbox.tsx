import type { Media } from "@types";
import {
	type Component,
	createEffect,
	createMemo,
	For,
	Match,
	onCleanup,
	Show,
	Switch,
} from "solid-js";
import Modal from "@/components/Modal/Modal";
import { mediaAlt, mediaLabel } from "../helpers";

/** A large preview of one gallery item. Arrow keys move between items. */
const AgentPreviewLightbox: Component<{
	items: Media[];
	activeId: number | undefined;
	onActiveChange: (id: number | undefined) => void;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const index = createMemo(() =>
		props.items.findIndex((media) => media.id === props.activeId),
	);
	const active = createMemo(() => props.items[index()]);

	// ----------------------------------------
	// Functions
	const step = (by: number) => {
		const next =
			props.items[(index() + by + props.items.length) % props.items.length];
		if (next) props.onActiveChange(next.id);
	};
	const onKeyDown = (event: KeyboardEvent) => {
		//* players use arrow keys to seek
		if (event.target instanceof HTMLMediaElement) return;
		if (event.key === "ArrowLeft") step(-1);
		if (event.key === "ArrowRight") step(1);
	};
	const videoSources = (media: Media) =>
		media.type === "video" && media.sources.length
			? media.sources
			: [{ url: media.url, mimeType: "" }];

	// ----------------------------------------
	// Effects
	createEffect(() => {
		if (active() === undefined || props.items.length < 2) return;
		window.addEventListener("keydown", onKeyDown);
		onCleanup(() => window.removeEventListener("keydown", onKeyDown));
	});

	// ----------------------------------------
	// Render
	return (
		<Modal.Root
			open={active() !== undefined}
			onOpenChange={(open) => {
				if (!open) props.onActiveChange(undefined);
			}}
			size="lg"
			class="w-auto! max-w-[90vw]! rounded-none! border-0! bg-transparent!"
		>
			<Show when={active()}>
				{(media) => (
					<>
						<Modal.Title class="sr-only">{mediaLabel(media())}</Modal.Title>
						<Modal.Body padding="none">
							<div class="flex justify-center">
								{/* keyed, so players reload their sources when the item changes */}
								<Show when={media()} keyed>
									{(item) => (
										<Switch>
											<Match when={item.type === "image"}>
												<img
													src={item.url}
													alt={mediaAlt(item)}
													class="max-h-[85vh] max-w-full rounded-lg object-contain"
												/>
											</Match>
											<Match when={item.type === "video"}>
												{/* biome-ignore lint/a11y/useMediaCaption: plays the original media, which has no generated captions */}
												<video
													controls
													autoplay
													class="max-h-[85vh] max-w-full rounded-lg"
													aria-label={mediaLabel(item)}
												>
													<For each={videoSources(item)}>
														{(source) => (
															<source
																src={source.url}
																type={source.mimeType || undefined}
															/>
														)}
													</For>
												</video>
											</Match>
											<Match when={item.type === "audio"}>
												{/* biome-ignore lint/a11y/useMediaCaption: plays the original media, which has no generated captions */}
												<audio
													src={item.url}
													controls
													autoplay
													class="w-[min(90vw,32rem)]"
													aria-label={mediaLabel(item)}
												/>
											</Match>
										</Switch>
									)}
								</Show>
							</div>
						</Modal.Body>
					</>
				)}
			</Show>
		</Modal.Root>
	);
};

export default AgentPreviewLightbox;

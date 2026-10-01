import type { Media } from "@types";
import { FaSolidChevronLeft, FaSolidChevronRight } from "solid-icons/fa";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	For,
	Match,
	onCleanup,
	Show,
	Switch,
} from "solid-js";
import Modal from "@/components/Modal/Modal";
import ViewMediaDrawer from "@/components/ViewMediaDrawer/ViewMediaDrawer";
import T from "@/translations";
import {
	mediaAlt,
	mediaDetails,
	mediaLabel,
	previewButtonClass,
} from "../helpers";
import AgentPreviewActions from "./AgentPreviewActions";
import AgentPreviewAttach from "./AgentPreviewAttach";

const AgentPreviewLightbox: Component<{
	items: Media[];
	activeId: number | undefined;
	onActiveChange: (id: number | undefined) => void;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [detailsId, setDetailsId] = createSignal<number>();

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
	const showDetails = (media: Media) => {
		props.onActiveChange(undefined);
		setDetailsId(media.id);
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
		<>
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
								<div class="flex flex-col items-center gap-2">
									{/* keyed, so players reload their sources when the item changes */}
									<Show when={media()} keyed>
										{(item) => (
											<Switch>
												<Match when={item.type === "image"}>
													<img
														src={item.url}
														alt={mediaAlt(item)}
														class="max-h-[75vh] max-w-full rounded-lg object-contain"
													/>
												</Match>
												<Match when={item.type === "video"}>
													{/* biome-ignore lint/a11y/useMediaCaption: plays the original media, which has no generated captions */}
													<video
														controls
														autoplay
														class="max-h-[75vh] max-w-full rounded-lg"
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
									<div class="flex w-[min(90vw,32rem)] items-center gap-3 rounded-lg border border-border bg-card px-3 py-2">
										<Show when={props.items.length > 1}>
											<div class="flex shrink-0 items-center gap-1.5">
												<button
													type="button"
													class={`${previewButtonClass} border-border bg-card text-title`}
													aria-label={T()("agent.preview.previous")}
													onClick={() => step(-1)}
												>
													<FaSolidChevronLeft size={10} />
												</button>
												<span class="text-[11px] text-muted tabular-nums">
													{T()("agent.preview.position", {
														current: index() + 1,
														total: props.items.length,
													})}
												</span>
												<button
													type="button"
													class={`${previewButtonClass} border-border bg-card text-title`}
													aria-label={T()("agent.preview.next")}
													onClick={() => step(1)}
												>
													<FaSolidChevronRight size={10} />
												</button>
											</div>
										</Show>
										<div class="min-w-0 flex-1">
											<p class="truncate text-sm text-title">
												{mediaLabel(media())}
											</p>
											<p class="truncate text-xs text-muted">
												{mediaDetails(media())}
											</p>
										</div>
										<AgentPreviewAttach media={media()} />
										<AgentPreviewActions
											media={media()}
											onDetails={() => showDetails(media())}
										/>
									</div>
								</div>
							</Modal.Body>
						</>
					)}
				</Show>
			</Modal.Root>
			<Show when={detailsId() !== undefined}>
				<ViewMediaDrawer
					id={detailsId}
					state={{
						open: true,
						setOpen: (open) => {
							if (!open) setDetailsId(undefined);
						},
						parentFolderId: () => undefined,
					}}
				/>
			</Show>
		</>
	);
};

export default AgentPreviewLightbox;

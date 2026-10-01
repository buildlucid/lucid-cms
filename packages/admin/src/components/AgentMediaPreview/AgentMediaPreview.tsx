import type { AgentWidgetPart, Media } from "@types";
import classnames from "classnames";
import { FaSolidCheck, FaSolidEyeSlash, FaSolidPlus } from "solid-icons/fa";
import {
	type Component,
	createMemo,
	createSignal,
	For,
	type JSX,
	Match,
	Show,
	Switch,
} from "solid-js";
import AgentReferenceThumb from "@/components/AgentReferenceFiles/parts/AgentReferenceThumb";
import { useAgentTranscript } from "@/components/AgentTranscriptRow/AgentTranscriptContext";
import MediaPreview from "@/components/MediaPreview/MediaPreview";
import Modal from "@/components/Modal/Modal";
import api from "@/services/api";
import contentLocaleStore from "@/store/contentLocaleStore/contentLocaleStore";
import T from "@/translations";
import helpers from "@/utils/helpers";

const hasVisual = (media: Media) =>
	media.type === "image" || (media.type === "video" && media.poster !== null);

/**
 * A gallery the agent showed in the chat. It saves media IDs only, so each
 * viewer sees current details with their own access. Selecting a tile, or
 * Cmd/Ctrl-clicking it, attaches the media to the chat box.
 */
const AgentMediaPreview: Component<{
	conversationId: string;
	widget: AgentWidgetPart;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [expandedId, setExpandedId] = createSignal<number>();
	const transcript = useAgentTranscript();
	const previews = api.agent.useGetMediaPreviews({
		id: () => props.conversationId,
	});

	// ----------------------------------------
	// Memos
	const mediaIds = createMemo(() => {
		const value = props.widget.data.mediaIds;
		return props.widget.version === 1 &&
			Array.isArray(value) &&
			value.every(
				(id): id is number =>
					typeof id === "number" && Number.isInteger(id) && id > 0,
			)
			? value
			: [];
	});
	const single = createMemo(() => mediaIds().length === 1);
	const tileSize = createMemo(() =>
		single() ? "aspect-video w-full max-w-80" : "size-28",
	);
	const expanded = createMemo(() =>
		previews.data?.data.find((media) => media.id === expandedId()),
	);
	const attachments = createMemo(() => transcript?.mediaAttachments());

	// ----------------------------------------
	// Functions
	const find = (id: number) =>
		previews.data?.data.find((media) => media.id === id);
	const label = (media: Media) =>
		helpers.getTranslation(media.title, contentLocaleStore.get.contentLocale) ||
		media.fileName ||
		T()("agent.preview.item", { id: media.id });
	const alt = (media: Media) =>
		(media.type === "image"
			? helpers.getTranslation(media.alt, contentLocaleStore.get.contentLocale)
			: undefined) || label(media);
	const canAttach = (media: Media) => attachments()?.canAttach(media) === true;
	const onTileClick = (event: MouseEvent, media: Media) => {
		if (!(event.metaKey || event.ctrlKey) || !canAttach(media)) return;
		event.preventDefault();
		attachments()?.toggle(media);
	};
	const videoSources = (media: Media) =>
		media.type === "video" && media.sources.length
			? media.sources
			: [{ url: media.url, mimeType: "" }];
	const tileClasses = (media: Media) =>
		classnames(
			"relative block size-full overflow-hidden rounded-lg border bg-card-hover focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary",
			attachments()?.isAttached(media.id) ? "border-primary" : "border-border",
			{ "rectangle-background": hasVisual(media) },
		);
	const tileContent = (media: Media): JSX.Element => (
		<Show
			when={media.status !== "ready" || hasVisual(media)}
			fallback={
				<AgentReferenceThumb
					reference={{
						type: "media",
						mediaId: media.id,
						label: label(media),
						mimeType: media.meta.mimeType,
					}}
					iconSize={single() ? 28 : 20}
				/>
			}
		>
			<MediaPreview
				media={media}
				alt={alt(media)}
				imageFit="contain"
				preset={single() ? "thumbnail-large" : "thumbnail-medium"}
			/>
		</Show>
	);

	// ----------------------------------------
	// Render
	return (
		<>
			<section
				class="isolate flex flex-wrap gap-2"
				aria-label={T()("agent.preview.gallery")}
			>
				<For each={mediaIds()}>
					{(id) => (
						<Show
							when={find(id)}
							fallback={
								<div
									class={classnames(
										"flex items-center justify-center rounded-lg border border-border bg-input text-muted",
										tileSize(),
										{ "animate-pulse": previews.isPending },
									)}
									role="img"
									aria-label={
										previews.isPending
											? T()("agent.preview.loading")
											: T()("agent.preview.unavailable")
									}
									title={
										previews.isPending
											? undefined
											: T()("agent.preview.unavailable")
									}
								>
									<Show when={!previews.isPending}>
										<FaSolidEyeSlash size={14} />
									</Show>
								</div>
							}
						>
							{(media) => (
								<div
									class={classnames("group relative", tileSize())}
									title={label(media())}
								>
									<button
										type="button"
										disabled={media().status !== "ready"}
										class={tileClasses(media())}
										aria-label={T()("agent.preview.expand", {
											name: label(media()),
										})}
										onClick={(event) => {
											onTileClick(event, media());
											if (!event.defaultPrevented) setExpandedId(media().id);
										}}
									>
										{tileContent(media())}
									</button>
									<Show when={canAttach(media())}>
										<button
											type="button"
											class={classnames(
												"absolute top-1.5 left-1.5 z-30 flex size-6 items-center justify-center rounded-full border shadow-sm transition-opacity focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary",
												attachments()?.isAttached(media().id)
													? "border-primary bg-primary text-primary-foreground"
													: "border-border bg-card text-title opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
											)}
											aria-pressed={attachments()?.isAttached(media().id)}
											aria-label={T()(
												attachments()?.isAttached(media().id)
													? "agent.preview.detach"
													: "agent.preview.attach",
												{ name: label(media()) },
											)}
											onClick={() => attachments()?.toggle(media())}
										>
											<Show
												when={attachments()?.isAttached(media().id)}
												fallback={<FaSolidPlus size={10} />}
											>
												<FaSolidCheck size={10} />
											</Show>
										</button>
									</Show>
								</div>
							)}
						</Show>
					)}
				</For>
			</section>
			<Modal.Root
				open={expanded() !== undefined}
				onOpenChange={(open) => {
					if (!open) setExpandedId(undefined);
				}}
				size="lg"
				class="w-auto! max-w-[90vw]! rounded-none! border-0! bg-transparent!"
			>
				<Show when={expanded()}>
					{(media) => (
						<>
							<Modal.Title class="sr-only">{label(media())}</Modal.Title>
							<Modal.Body padding="none" class="flex justify-center">
								<Switch>
									<Match when={media().type === "image"}>
										<img
											src={media().url}
											alt={alt(media())}
											class="max-h-[85vh] max-w-full rounded-lg object-contain"
										/>
									</Match>
									<Match when={media().type === "video"}>
										{/* biome-ignore lint/a11y/useMediaCaption: plays the original media, which has no generated captions */}
										<video
											controls
											autoplay
											class="max-h-[85vh] max-w-full rounded-lg"
											aria-label={label(media())}
										>
											<For each={videoSources(media())}>
												{(source) => (
													<source
														src={source.url}
														type={source.mimeType || undefined}
													/>
												)}
											</For>
										</video>
									</Match>
									<Match when={media().type === "audio"}>
										{/* biome-ignore lint/a11y/useMediaCaption: plays the original media, which has no generated captions */}
										<audio
											src={media().url}
											controls
											autoplay
											class="w-[min(90vw,32rem)]"
											aria-label={label(media())}
										/>
									</Match>
								</Switch>
							</Modal.Body>
						</>
					)}
				</Show>
			</Modal.Root>
		</>
	);
};

export default AgentMediaPreview;

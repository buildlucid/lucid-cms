import type { AgentWidgetPart, Media } from "@types";
import classnames from "classnames";
import { TbOutlineEyeOff } from "solid-icons/tb";
import {
	type Component,
	createMemo,
	createSignal,
	For,
	type JSX,
	Show,
} from "solid-js";
import AgentReferenceThumb from "@/components/AgentReferenceThumb/AgentReferenceThumb";
import { useAgentTranscript } from "@/components/AgentTranscriptRow/AgentTranscriptContext";
import AudioPill from "@/components/AudioPill/AudioPill";
import MediaPreview from "@/components/MediaPreview/MediaPreview";
import api from "@/services/api";
import T from "@/translations";
import { hasVisual, mediaAlt, mediaLabel } from "./helpers";
import AgentPreviewActions from "./parts/AgentPreviewActions";
import AgentPreviewAttach from "./parts/AgentPreviewAttach";
import AgentPreviewLightbox from "./parts/AgentPreviewLightbox";

/**
 * Shows chat media references with inline audio and preview, attach, copy and download controls.
 * @remarks Stores only media IDs, so each viewer loads current details with their own access.
 */
const AgentMediaPreviewV1: Component<{
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
		return Array.isArray(value) &&
			value.every(
				(id): id is number =>
					typeof id === "number" && Number.isInteger(id) && id > 0,
			)
			? value
			: [];
	});
	//* audio plays in place, so the lightbox only steps through tiles
	const readyItems = createMemo(() =>
		mediaIds().flatMap((id) => {
			const media = previews.data?.data.find((item) => item.id === id);
			return media?.status === "ready" && media.type !== "audio" ? [media] : [];
		}),
	);
	const single = createMemo(() => mediaIds().length === 1);
	const tileSize = createMemo(() =>
		single() ? "aspect-video w-full max-w-80" : "size-28",
	);
	const attachments = createMemo(() => transcript?.mediaAttachments());

	// ----------------------------------------
	// Functions
	const find = (id: number) =>
		previews.data?.data.find((media) => media.id === id);
	const onTileClick = (event: MouseEvent, media: Media) => {
		if (!(event.metaKey || event.ctrlKey)) return;
		if (attachments()?.canAttach(media) !== true) return;
		event.preventDefault();
		attachments()?.toggle(media);
	};
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
						label: mediaLabel(media),
						mimeType: media.meta.mimeType,
					}}
					iconSize={single() ? 28 : 20}
				/>
			}
		>
			<MediaPreview
				media={media}
				alt={mediaAlt(media)}
				imageFit="contain"
				preset={single() ? "thumbnail-large" : "thumbnail-medium"}
			/>
		</Show>
	);

	const tile = (media: Media): JSX.Element => (
		<div
			class={classnames("group relative", tileSize())}
			title={mediaLabel(media)}
		>
			<button
				type="button"
				disabled={media.status !== "ready"}
				class={tileClasses(media)}
				aria-label={T()("agent.preview.expand", {
					name: mediaLabel(media),
				})}
				onClick={(event) => {
					onTileClick(event, media);
					if (!event.defaultPrevented) setExpandedId(media.id);
				}}
			>
				{tileContent(media)}
			</button>
			<AgentPreviewAttach
				media={media}
				revealOnHover
				class="absolute top-1.5 left-1.5 z-30"
			/>
			<Show when={media.status === "ready"}>
				<AgentPreviewActions
					media={media}
					class="absolute top-1.5 right-1.5 z-30 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"
				/>
			</Show>
		</div>
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
										<TbOutlineEyeOff size={14} />
									</Show>
								</div>
							}
						>
							{(media) => (
								<Show
									when={media().type === "audio" && media().status === "ready"}
									fallback={tile(media())}
								>
									{/* audio plays in place, so it shows as a player rather than a tile */}
									<div class="group flex w-full max-w-96 min-w-0 items-center gap-2">
										<AudioPill
											src={media().url}
											label={mediaLabel(media())}
											class="w-full max-w-80"
										/>
										<div class="flex shrink-0 items-center gap-1">
											<AgentPreviewAttach media={media()} revealOnHover />
											<AgentPreviewActions
												media={media()}
												class="opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"
											/>
										</div>
									</div>
								</Show>
							)}
						</Show>
					)}
				</For>
			</section>
			<AgentPreviewLightbox
				items={readyItems()}
				activeId={expandedId()}
				onActiveChange={setExpandedId}
			/>
		</>
	);
};

export default AgentMediaPreviewV1;

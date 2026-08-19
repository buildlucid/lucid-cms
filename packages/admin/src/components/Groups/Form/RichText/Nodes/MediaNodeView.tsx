import type { FieldError, MediaRef } from "@types";
import classNames from "classnames";
import {
	FaSolidFile,
	FaSolidFileLines,
	FaSolidFileZipper,
} from "solid-icons/fa";
import {
	type Accessor,
	type Component,
	createMemo,
	Match,
	Show,
	Switch,
} from "solid-js";
import ClickToCopy from "@/components/Partials/ClickToCopy";
import Pill from "@/components/Partials/Pill";
import T from "@/translations";
import { resolveFieldErrorMessage } from "@/utils/error-helpers";
import helpers from "@/utils/helpers";
import { countFieldErrors } from "@/utils/structural-field-helpers";
import type { RichTextOptions } from "../types";
import NodeActions from "./NodeActions";

export interface MediaNodeViewProps {
	mediaId: unknown;
	reference?: NonNullable<MediaRef>;
	locale?: string;
	isEditable: () => boolean;
	getPos: () => number | undefined;
	setMediaId: (position: number, mediaId: number) => void;
	remove: () => void;
	selectMedia?: NonNullable<RichTextOptions["callbacks"]>["selectMedia"];
	errors: Accessor<FieldError[]>;
}

const MediaNodeView: Component<MediaNodeViewProps> = (props) => {
	// -------------------------------
	// Memos
	const available = () => Boolean(props.reference?.url);
	const errorCount = createMemo(() => countFieldErrors(props.errors()));
	const hasErrors = createMemo(() => errorCount() > 0);
	const errorMessage = createMemo(() => {
		const message = props.errors()[0]?.message;
		return message ? resolveFieldErrorMessage(message) : undefined;
	});
	const title = () => {
		const reference = props.reference;
		if (!reference) return "";

		return (
			helpers.getTranslation(reference.title, props.locale) ||
			(reference.type === "image"
				? helpers.getTranslation(reference.alt, props.locale)
				: "") ||
			helpers.formatFileNameTitle(reference.fileName) ||
			reference.key ||
			T()("editor.rich.text.media.fallback", { id: reference.id })
		);
	};
	const alt = () => {
		const reference = props.reference;
		if (!reference) return "";
		if (reference.type !== "image") return title();
		return helpers.getTranslation(reference.alt, props.locale) || title();
	};
	const dimensions = () => {
		const reference = props.reference;
		if (
			!reference ||
			(reference.type !== "image" && reference.type !== "video") ||
			!("width" in reference.meta) ||
			!reference.meta.width ||
			!reference.meta.height
		) {
			return null;
		}

		return `${reference.meta.width} × ${reference.meta.height}`;
	};
	const videoPoster = () => {
		const reference = props.reference;
		return reference?.type === "video" ? reference.poster?.url : undefined;
	};

	// -------------------------------
	// Functions
	const selectMedia = (event: MouseEvent) => {
		event.preventDefault();
		event.stopPropagation();
		if (!props.isEditable() || typeof props.mediaId !== "number") return;

		const position = props.getPos();
		if (typeof position !== "number") return;

		props.selectMedia?.({
			currentId: props.mediaId,
			onSelect: (nextId) => props.setMediaId(position, nextId),
		});
	};

	// -------------------------------
	// Render
	return (
		<div
			contentEditable={false}
			class={classNames(
				"group relative my-3 flex w-full select-none items-center gap-3 rounded-xl border bg-card-base p-3 transition-[border-color,box-shadow,background-color] duration-150 hover:border-primary-muted-border [&.ProseMirror-selectednode]:border-primary-base [&.ProseMirror-selectednode]:ring-2 [&.ProseMirror-selectednode]:ring-primary-base/20",
				{
					"border-border": available() && !hasErrors(),
					"border-error-base/50 bg-linear-to-b from-error-base/10 to-card-base to-30%":
						!available() || hasErrors(),
				},
			)}
			data-lucid-rich-text-media=""
		>
			<Show
				when={available() && props.reference ? props.reference : undefined}
				fallback={
					<div class="min-w-0 grow overflow-hidden rounded-lg border border-border bg-input-base px-4 py-3">
						<p class="truncate text-sm font-medium text-title mb-0!">
							{T()("editor.rich.text.media.fallback", {
								id: typeof props.mediaId === "number" ? props.mediaId : "?",
							})}
						</p>
						<p class="mt-1 text-xs font-medium text-error-base mb-0!">
							{errorMessage() ?? T()("editor.rich.text.media.unavailable")}
						</p>
					</div>
				}
			>
				{(reference) => (
					<div class="min-w-0 grow overflow-hidden rounded-xl border border-border">
						<div
							class={classNames(
								"relative isolate flex min-h-24 w-full items-center justify-center bg-card-base p-4",
								{
									"rectangle-background":
										reference().type === "image" ||
										reference().type === "video",
								},
							)}
						>
							<div
								class="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-wrap items-center gap-2 bg-linear-to-b from-black/45 via-black/20 to-transparent p-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
								data-lucid-rich-text-media-metadata=""
							>
								<div class="flex flex-wrap items-center gap-1.5">
									<Show when={reference().isDeleted}>
										<Pill
											theme="red"
											tooltip={T()("common.status.deleted.tooltip")}
										>
											{T()("common.status.deleted")}
										</Pill>
									</Show>
									<Show when={!reference().public}>
										<Pill
											theme="red"
											tooltip={T()("media.visibility.private.tooltip")}
										>
											{T()("common.private")}
										</Pill>
									</Show>
									<Show when={reference().meta.fileSize}>
										<Pill theme="outline">
											{helpers.bytesToSize(reference().meta.fileSize)}
										</Pill>
									</Show>
									<Show when={dimensions()}>
										{(value) => <Pill theme="outline">{value()}</Pill>}
									</Show>
									<Show when={reference().meta.mimeType}>
										{(mimeType) => <Pill theme="outline">{mimeType()}</Pill>}
									</Show>
									<Show when={reference().meta.extension}>
										{(extension) => (
											<Pill theme="outline">{extension().toUpperCase()}</Pill>
										)}
									</Show>
								</div>
							</div>
							<div
								class="relative z-10 flex max-h-64 min-h-24 w-full items-center justify-center [&_audio]:max-h-64 [&_img]:max-h-64 [&_img]:h-auto [&_img]:w-auto [&_img]:max-w-full [&_video]:max-h-64 [&_video]:h-auto [&_video]:w-auto [&_video]:max-w-full"
								data-lucid-rich-text-media-preview-content=""
							>
								<Switch
									fallback={
										<div class="relative z-10 flex flex-col items-center gap-2 text-subtitle">
											<FaSolidFile
												size={40}
												class="text-icon-base opacity-40"
											/>
											<span class="text-sm font-medium capitalize">
												{reference().type}
											</span>
										</div>
									}
								>
									<Match when={reference().type === "archive"}>
										<FaSolidFileZipper
											size={40}
											class="relative z-10 text-icon-base opacity-40"
										/>
									</Match>
									<Match when={reference().type === "document"}>
										<FaSolidFileLines
											size={40}
											class="relative z-10 text-icon-base opacity-40"
										/>
									</Match>
									<Match when={reference().type === "image"}>
										<img
											src={reference().url}
											alt={alt()}
											class="relative z-10 max-h-64 h-auto w-auto max-w-full object-contain"
											draggable={false}
										/>
									</Match>
									<Match when={reference().type === "audio"}>
										{/* biome-ignore lint/a11y/useMediaCaption: referenced CMS audio may not have a caption track */}
										<audio
											src={reference().url}
											controls
											class="relative z-10 m-5 max-h-64 w-[calc(100%-2.5rem)]"
										/>
									</Match>
									<Match when={reference().type === "video"}>
										{/* biome-ignore lint/a11y/useMediaCaption: referenced CMS video may not have a caption track */}
										<video
											src={reference().url}
											poster={videoPoster()}
											controls
											class="relative z-10 max-h-64 h-auto w-auto max-w-full bg-black object-contain"
										/>
									</Match>
								</Switch>
							</div>
						</div>
						<div
							class="flex items-center justify-between gap-3 border-t border-border bg-input-base p-3"
							data-lucid-rich-text-media-info=""
						>
							<div class="flex min-w-0 items-start gap-2">
								<div class="min-w-0">
									<p class="line-clamp-1 text-sm font-medium text-subtitle mb-0!">
										{title()}
									</p>
									<div class="flex min-w-0 items-center gap-2 mt-1">
										<ClickToCopy
											type="simple"
											text={reference().key}
											value={reference().url}
											class="max-w-full text-xs text-unfocused"
										/>
									</div>
								</div>
							</div>
						</div>
						<Show when={errorMessage()}>
							{(message) => (
								<div class="flex items-center gap-3 border-error-base/20 border-t bg-error-base/10 px-3 py-2">
									<span class="min-w-0 grow text-left text-xs font-medium text-error-base">
										{message()}
									</span>
								</div>
							)}
						</Show>
					</div>
				)}
			</Show>
			{props.isEditable() ? (
				<NodeActions
					editLabel={T()("editor.rich.text.media.edit")}
					removeLabel={T()("editor.rich.text.media.remove")}
					editDisabled={typeof props.mediaId !== "number"}
					showRemove
					onEdit={selectMedia}
					onRemove={props.remove}
				/>
			) : null}
		</div>
	);
};

export default MediaNodeView;

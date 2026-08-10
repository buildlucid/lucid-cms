import type { MediaRef } from "@types";
import classNames from "classnames";
import { FaSolidPen } from "solid-icons/fa";
import { type Component, Match, Show, Switch } from "solid-js";
import Button from "@/components/Partials/Button";
import ClickToCopy from "@/components/Partials/ClickToCopy";
import Pill from "@/components/Partials/Pill";
import T from "@/translations";
import helpers from "@/utils/helpers";
import type { RichTextOptions } from "../types";

export interface MediaNodeViewProps {
	mediaId: unknown;
	reference?: NonNullable<MediaRef>;
	locale?: string;
	isEditable: () => boolean;
	allowedTypes: Array<"image" | "audio" | "video">;
	getPos: () => number | undefined;
	setMediaId: (position: number, mediaId: number) => void;
	selectMedia?: NonNullable<RichTextOptions["callbacks"]>["selectMedia"];
}

const MediaNodePreview: Component<{
	reference: NonNullable<MediaRef>;
	alt: string;
}> = (props) => {
	// -------------------------------
	// Render
	return (
		<Switch
			fallback={
				<span class="relative z-10 text-sm font-medium capitalize text-subtitle">
					{props.reference.type}
				</span>
			}
		>
			<Match when={props.reference.type === "image"}>
				<img
					src={props.reference.file.url}
					alt={props.alt}
					class="relative z-10 max-h-96 h-auto w-auto max-w-full object-contain"
					draggable={false}
				/>
			</Match>
			<Match when={props.reference.type === "audio"}>
				{/* biome-ignore lint/a11y/useMediaCaption: referenced CMS audio may not have a caption track */}
				<audio
					src={props.reference.file.url}
					controls
					class="relative z-10 m-5 w-[calc(100%-2.5rem)]"
				/>
			</Match>
			<Match when={props.reference.type === "video"}>
				{/* biome-ignore lint/a11y/useMediaCaption: referenced CMS video may not have a caption track */}
				<video
					src={props.reference.file.url}
					poster={
						props.reference.type === "video"
							? props.reference.poster?.file.url
							: undefined
					}
					controls
					class="relative z-10 max-h-96 h-auto w-auto max-w-full bg-black object-contain"
				/>
			</Match>
		</Switch>
	);
};

const MediaMetadata: Component<{
	reference: NonNullable<MediaRef>;
}> = (props) => {
	// -------------------------------
	// Memos
	const dimensions = () => {
		if (
			(props.reference.type !== "image" && props.reference.type !== "video") ||
			!("width" in props.reference.file.meta) ||
			!props.reference.file.meta.width ||
			!props.reference.file.meta.height
		) {
			return null;
		}

		return `${props.reference.file.meta.width} × ${props.reference.file.meta.height}`;
	};

	// -------------------------------
	// Render
	return (
		<div class="flex flex-wrap items-center gap-1.5">
			<Show when={props.reference.isDeleted}>
				<Pill theme="red" tooltip={T()("common.status.deleted.tooltip")}>
					{T()("common.status.deleted")}
				</Pill>
			</Show>
			<Show when={!props.reference.public}>
				<Pill theme="red" tooltip={T()("media.visibility.private.tooltip")}>
					{T()("common.private")}
				</Pill>
			</Show>
			<Show when={props.reference.file.meta.fileSize}>
				<Pill theme="outline">
					{helpers.bytesToSize(props.reference.file.meta.fileSize)}
				</Pill>
			</Show>
			<Show when={dimensions()}>
				{(value) => <Pill theme="outline">{value()}</Pill>}
			</Show>
			<Show when={props.reference.file.meta.mimeType}>
				{(mimeType) => <Pill theme="outline">{mimeType()}</Pill>}
			</Show>
			<Show when={props.reference.file.meta.extension}>
				{(extension) => (
					<Pill theme="outline">{extension().toUpperCase()}</Pill>
				)}
			</Show>
		</div>
	);
};

const MediaNodeView: Component<MediaNodeViewProps> = (props) => {
	// -------------------------------
	// Memos
	const available = () => Boolean(props.reference?.file.url);
	const title = () => {
		const reference = props.reference;
		if (!reference) return "";

		return (
			helpers.getTranslation(reference.title, props.locale) ||
			(reference.type === "image"
				? helpers.getTranslation(reference.alt, props.locale)
				: "") ||
			helpers.formatFileNameTitle(reference.file.fileName) ||
			reference.file.key ||
			T()("editor.rich.text.media.fallback", { id: reference.id })
		);
	};
	const alt = () => {
		const reference = props.reference;
		if (!reference) return "";
		if (reference.type !== "image") return title();
		return helpers.getTranslation(reference.alt, props.locale) || title();
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
			allowedTypes: props.allowedTypes,
			onSelect: (nextId) => props.setMediaId(position, nextId),
		});
	};

	// -------------------------------
	// Render
	return (
		<div
			contentEditable={false}
			class={classNames(
				"group my-3 flex w-full select-none items-center gap-3 rounded-xl border border-border bg-card-base p-3",
				{
					"bg-linear-to-b from-error-base/10 to-card-base to-30%": !available(),
				},
			)}
			data-lucid-rich-text-media=""
		>
			<Show
				when={available() && props.reference ? props.reference : undefined}
				fallback={
					<div class="flex min-h-24 min-w-0 grow items-center justify-center rounded-xl border border-border bg-input-base px-5 py-8 text-sm text-unfocused">
						{T()("editor.rich.text.media.unavailable")}
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
								<MediaMetadata reference={reference()} />
							</div>
							<div
								class="relative z-10 flex max-h-96 min-h-24 w-full items-center justify-center [&_img]:max-h-96 [&_img]:h-auto [&_img]:w-auto [&_img]:max-w-full [&_video]:max-h-96 [&_video]:h-auto [&_video]:w-auto [&_video]:max-w-full"
								data-lucid-rich-text-media-preview-content=""
							>
								<MediaNodePreview reference={reference()} alt={alt()} />
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
											text={reference().file.key}
											value={reference().file.url}
											class="max-w-full text-xs text-unfocused"
										/>
									</div>
								</div>
							</div>
						</div>
					</div>
				)}
			</Show>
			<Button
				type="button"
				theme="circle"
				size="icon-subtle"
				onClick={selectMedia}
				disabled={typeof props.mediaId !== "number"}
				aria-label={T()("editor.rich.text.media.edit")}
				title={T()("editor.rich.text.media.edit")}
			>
				<FaSolidPen size={12} />
			</Button>
		</div>
	);
};

export default MediaNodeView;

import type { ErrorResult, FieldError } from "@types";
import classNames from "classnames";
import { FaSolidPen, FaSolidPlus, FaSolidXmark } from "solid-icons/fa";
import {
	type Accessor,
	type Component,
	createMemo,
	For,
	Match,
	Show,
	Switch,
} from "solid-js";
import { DescribedBy, ErrorMessage, Label } from "@/components/Groups/Form";
import Button from "@/components/Partials/Button";
import ClickToCopy from "@/components/Partials/ClickToCopy";
import DragDrop, { type DragDropCBT } from "@/components/Partials/DragDrop";
import MediaPreview from "@/components/Partials/MediaPreview";
import Pill from "@/components/Partials/Pill";
import brickStore from "@/store/brickStore";
import contentLocaleStore from "@/store/contentLocaleStore";
import pageBuilderModalsStore from "@/store/pageBuilderModalsStore";
import T from "@/translations";
import { moveArrayItem } from "@/utils/array-helpers";
import { normalizeFieldErrors } from "@/utils/error-helpers";
import helpers from "@/utils/helpers";
import type { MediaRelationRef } from "@/utils/relation-field-helpers";
import { mediaResponseToRef } from "@/utils/relation-field-helpers";

interface MediaSelectProps {
	id: string;
	value: number[] | undefined;
	refs: Accessor<MediaRelationRef[] | undefined>;
	onChange: (_value: number[], _refs: MediaRelationRef[]) => void;
	extensions?: string[];
	type?: string;
	multiple?: boolean;
	copy?: {
		label?: string;
		describedBy?: string;
	};
	disabled?: boolean;
	noMargin?: boolean;
	required?: boolean;
	errors?: ErrorResult | FieldError | FieldError[];
	localised?: boolean;
	altLocaleError?: boolean;
	fieldColumnIsMissing?: boolean;
	hideOptionalText?: boolean;
}

const MEDIA_SELECT_DRAG_DROP_KEY = "media-select-zone";

export const MediaSelect: Component<MediaSelectProps> = (props) => {
	// -------------------------------
	// Functions
	const parseExtensions = (extensions?: string[]) => {
		if (!extensions) return undefined;
		return extensions
			.map((extension) => {
				return extension.replace(".", "");
			})
			.join(",");
	};
	const getMediaTitle = (media?: MediaRelationRef) => {
		return (
			helpers.getRecordTranslation(media?.title, contentLocale()) ||
			helpers.getRecordTranslation(media?.alt, contentLocale()) ||
			media?.key ||
			""
		);
	};
	const getMediaAlt = (media?: MediaRelationRef) => {
		return (
			helpers.getRecordTranslation(media?.alt, contentLocale()) ||
			getMediaTitle(media)
		);
	};
	const getMediaDimensions = (media?: MediaRelationRef) => {
		const width = media?.width ?? null;
		const height = media?.height ?? null;
		if (!width || !height) return null;
		return `${width}x${height}`;
	};
	const openMediaSelectModal = () => {
		pageBuilderModalsStore.open("mediaSelect", {
			data: {
				extensions: parseExtensions(props.extensions),
				type: props.type,
				multiple: isMultiple(),
				selected: props.value,
				selectedRefs: selectedMediaRefs(),
			},
			onCallback: (selection) => {
				props.onChange(selection.value, selection.refs);
			},
		});
	};
	const openMediaUploadPanel = () => {
		pageBuilderModalsStore.open("mediaUpload", {
			data: {
				extensions: parseExtensions(props.extensions),
				type: props.type,
			},
			onCallback: (media) => {
				const nextRef = mediaResponseToRef(media);

				if (!isMultiple()) {
					props.onChange([nextRef.id], [nextRef]);
					return;
				}

				const nextRefsById = new Map(
					selectedMediaRefs().map((selectedMedia) => [
						selectedMedia.id,
						selectedMedia,
					]),
				);
				nextRefsById.set(nextRef.id, nextRef);
				const nextRefs = Array.from(nextRefsById.values());

				props.onChange(
					nextRefs.map((selectedMedia) => selectedMedia.id),
					nextRefs,
				);
			},
		});
	};
	const clearSelection = () => {
		props.onChange([], []);
	};
	const removeSelectedMedia = (mediaId: number) => {
		props.onChange(
			(props.value || []).filter((selectedId) => selectedId !== mediaId),
			selectedMediaRefs().filter((media) => media.id !== mediaId),
		);
	};
	const reorderSelectedMedia = (ref: string, targetRef: string) => {
		if (props.disabled) return;

		const mediaRefs = selectedMediaRefs();
		const fromIndex = mediaRefs.findIndex((media) => `${media.id}` === ref);
		const toIndex = mediaRefs.findIndex((media) => `${media.id}` === targetRef);
		const nextMediaRefs = moveArrayItem(mediaRefs, fromIndex, toIndex);

		if (nextMediaRefs === mediaRefs) return;

		props.onChange(
			nextMediaRefs.map((media) => media.id),
			nextMediaRefs,
		);
	};

	// -------------------------------
	// Memos
	const isMultiple = createMemo(() => props.multiple === true);
	const contentLocale = createMemo(() => contentLocaleStore.get.contentLocale);
	const selectedMediaIds = createMemo(() => props.value ?? []);
	const selectedMediaRefs = createMemo(() => props.refs() ?? []);
	const primarySelectedMedia = createMemo(() => selectedMediaRefs()[0]);
	const mediaTitle = createMemo(() => getMediaTitle(primarySelectedMedia()));
	const mediaAlt = createMemo(() => getMediaAlt(primarySelectedMedia()));
	const mediaDimensions = createMemo(() =>
		getMediaDimensions(primarySelectedMedia()),
	);
	const fieldErrors = createMemo(() => normalizeFieldErrors(props.errors));
	const getItemErrors = (itemIndex: number) =>
		fieldErrors().filter((error) => error.itemIndex === itemIndex);
	const hasItemError = (itemIndex: number) =>
		getItemErrors(itemIndex).length > 0;

	// -------------------------------
	// Render
	return (
		<div
			class={classNames("w-full", {
				"mb-3 last:mb-0": props.noMargin !== true,
			})}
		>
			<Label
				id={props.id}
				label={props.copy?.label}
				required={props.required}
				theme={"basic"}
				altLocaleError={props.altLocaleError}
				localised={props.localised}
				fieldColumnIsMissing={props.fieldColumnIsMissing}
				hideOptionalText={props.hideOptionalText}
			/>
			<div class="w-full">
				<Switch>
					<Match when={selectedMediaIds().length === 0}>
						<Show when={isMultiple()}>
							<div class="min-h-42 flex items-center justify-center background-dotted border-dashed border-border rounded-md border">
								<p class="text-sm text-unfocused">{T()("nothing_selected")}</p>
							</div>
						</Show>
						<div
							class={classNames("flex flex-wrap gap-2", {
								"mt-3": isMultiple(),
							})}
						>
							<Button
								type="button"
								theme="border-outline"
								size="small"
								onClick={openMediaSelectModal}
								disabled={props.disabled}
								classes="capitalize"
							>
								{T()("select_media", {
									type: props.type || "media",
								})}
							</Button>
							<Button
								type="button"
								theme="basic"
								size="small"
								onClick={openMediaUploadPanel}
								disabled={props.disabled}
								classes="capitalize"
							>
								{T()("upload_media")}
							</Button>
						</div>
					</Match>
					<Match when={!isMultiple() && primarySelectedMedia()}>
						<div class="w-full  border border-border rounded-md bg-input-base overflow-hidden group">
							<div
								class={classNames("relative z-0 bg-card-base p-4", {
									"rectangle-background":
										primarySelectedMedia()?.type === "image" ||
										primarySelectedMedia()?.type === "video",
								})}
							>
								<div class="z-20 flex flex-wrap items-center gap-2 absolute top-0 left-0 right-0 p-3 bg-linear-to-b from-card-base via-card-base/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
									<Show
										when={
											primarySelectedMedia()?.isDeleted ||
											primarySelectedMedia()?.public === false
										}
									>
										<div class="flex flex-wrap items-center gap-2">
											<Show when={primarySelectedMedia()?.isDeleted}>
												<Pill theme="red" tooltip={T()("deleted_pill_tooltip")}>
													{T()("deleted")}
												</Pill>
											</Show>
											<Show when={!primarySelectedMedia()?.public}>
												<Pill theme="red" tooltip={T()("private_pill_tooltip")}>
													{T()("private")}
												</Pill>
											</Show>
										</div>
									</Show>
									<div class="flex flex-wrap items-center gap-2 ">
										<Show when={primarySelectedMedia()?.fileSize}>
											<Pill theme="outline">
												{helpers.bytesToSize(primarySelectedMedia()?.fileSize)}
											</Pill>
										</Show>
										<Show when={mediaDimensions()}>
											<Pill theme="outline">{mediaDimensions()}</Pill>
										</Show>
										<Show when={primarySelectedMedia()?.mimeType}>
											<Pill theme="outline">
												{primarySelectedMedia()?.mimeType}
											</Pill>
										</Show>
										<Show when={primarySelectedMedia()?.extension}>
											<Pill theme="outline">
												{primarySelectedMedia()?.extension.toUpperCase()}
											</Pill>
										</Show>
									</div>
								</div>
								<div class="w-full max-w-120 h-full max-h-96 mx-auto z-10 flex items-center justify-center :flex *:items-center *:justify-center [&_img]:max-h-96 [&_img]:h-auto [&_img]:w-auto [&_img]:max-w-full [&_video]:max-h-96 [&_video]:h-auto [&_video]:w-auto [&_video]:max-w-full">
									<MediaPreview
										media={{
											url: primarySelectedMedia()?.url || "",
											type: primarySelectedMedia()?.type || "image",
										}}
										alt={mediaAlt() || ""}
										richPreview={true}
										imageFit="contain"
									/>
								</div>
							</div>
							<div class="flex items-center justify-between gap-3 p-3 border-border bg-input-base border-t-0">
								<div class="flex items-start gap-2 min-w-0">
									<div class="min-w-0">
										<p class="text-sm text-subtitle font-medium line-clamp-1">
											{mediaTitle() || T()("no_translation")}
										</p>
										<div class=" border-t-0flex items-center gap-2 min-w-0">
											<ClickToCopy
												type="simple"
												text={primarySelectedMedia()?.key || ""}
												value={primarySelectedMedia()?.url || ""}
												class="text-xs text-unfocused max-w-full"
											/>
										</div>
									</div>
								</div>
								<div class="flex items-center gap-0.5 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
									<Button
										type="button"
										theme="secondary-subtle"
										size="icon-subtle"
										onClick={openMediaSelectModal}
										disabled={props.disabled}
										aria-label={T()("select_new_media", {
											type: props.type || "media",
										})}
									>
										<FaSolidPen size={12} />
									</Button>
									<Button
										type="button"
										theme="danger-subtle"
										size="icon-subtle"
										onClick={clearSelection}
										disabled={props.disabled}
										aria-label={T()("remove_media", {
											type: props.type || "media",
										})}
									>
										<FaSolidXmark size={14} />
									</Button>
								</div>
							</div>
						</div>
					</Match>
					<Match when={isMultiple()}>
						<div class="w-full overflow-hidden rounded-md border border-border dotted-background border-dashed">
							<Show when={selectedMediaRefs().length > 0}>
								<DragDrop
									animationMode="web-animation"
									sortOrder={(ref, targetRef) => {
										reorderSelectedMedia(ref, targetRef);
									}}
								>
									{({ dragDrop }) => (
										<div class="relative z-20 grid grid-cols-1 gap-3 p-3 lg:grid-cols-2 xl:grid-cols-3">
											<For each={selectedMediaRefs()}>
												{(media, index) => (
													<MediaSortableItem
														media={media}
														title={
															getMediaTitle(media) || T()("no_translation")
														}
														alt={getMediaAlt(media) || ""}
														dimensions={getMediaDimensions(media)}
														hasError={hasItemError(index())}
														removeSelectedMedia={removeSelectedMedia}
														disabled={props.disabled}
														dragDrop={dragDrop}
													/>
												)}
											</For>
											<Show when={selectedMediaRefs().length > 0}>
												<button
													type="button"
													class="relative hidden h-full items-center justify-center overflow-hidden rounded-md border border-border text-unfocused transition-colors duration-200 before:absolute before:-inset-3 before:bg-secondary-base/5 before:blur-2xl hover:border-primary-muted-border hover:text-title lg:flex lg:max-xl:[&:last-child:nth-child(2n+1)]:hidden xl:[&:last-child:nth-child(3n+1)]:hidden xl:[&:last-child:nth-child(3n+2)]:col-span-2"
													onClick={openMediaSelectModal}
													disabled={props.disabled}
													aria-label={T()("select_media", {
														type: props.type || "media",
													})}
												>
													<span class="relative z-10">
														<FaSolidPlus size={18} />
													</span>
												</button>
											</Show>
										</div>
									)}
								</DragDrop>
							</Show>
						</div>
						<div class="flex flex-wrap items-center justify-between gap-3 mt-3">
							<div class="flex flex-wrap items-center gap-2">
								<Button
									type="button"
									theme="border-outline"
									size="small"
									onClick={openMediaSelectModal}
									disabled={props.disabled}
									classes="capitalize"
								>
									{T()("select_media", {
										type: props.type || "media",
									})}
								</Button>
								<Button
									type="button"
									theme="basic"
									size="small"
									onClick={openMediaUploadPanel}
									disabled={props.disabled}
									classes="capitalize"
								>
									{T()("upload_media")}
								</Button>
							</div>
							<p class="text-sm text-unfocused">
								{selectedMediaIds().length} {T()("selected").toLowerCase()}
							</p>
						</div>
					</Match>
				</Switch>
			</div>
			<DescribedBy id={props.id} describedBy={props.copy?.describedBy} />
			<ErrorMessage id={props.id} errors={props.errors} />
		</div>
	);
};

const MediaSortableItem: Component<{
	media: MediaRelationRef;
	title: string;
	alt: string;
	dimensions: string | null;
	hasError: boolean;
	removeSelectedMedia: (mediaId: number) => void;
	dragDrop: DragDropCBT;
	disabled?: boolean;
}> = (props) => {
	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: native draggable container
		<div
			data-dragkey={MEDIA_SELECT_DRAG_DROP_KEY}
			data-dragref={`${props.media.id}`}
			style={{
				"view-transition-name": `media-select-item-${props.media.id}`,
			}}
			class={classNames(
				"group overflow-hidden rounded-md border bg-card-base ring-inset ring-primary-base transition-colors duration-200 transform-gpu",
				{
					"border-border": !props.hasError,
					"border-error-base ring-1 ring-inset ring-error-base": props.hasError,
					"opacity-60":
						props.dragDrop.getDragging()?.ref === `${props.media.id}`,
					"ring-1 ring-primary-base":
						props.dragDrop.getDraggingTarget()?.ref === `${props.media.id}` &&
						props.dragDrop.getDragging()?.ref !== `${props.media.id}` &&
						!props.hasError,
					"cursor-grab active:cursor-grabbing": props.disabled !== true,
				},
			)}
			draggable={props.disabled !== true}
			onDragStart={(e) => {
				brickStore.get.startRelationFieldDrag();
				props.dragDrop.onDragStart(e, {
					ref: `${props.media.id}`,
					key: MEDIA_SELECT_DRAG_DROP_KEY,
				});
			}}
			onDragEnd={(e) => {
				props.dragDrop.onDragEnd(e);
				brickStore.get.endRelationFieldDrag();
			}}
			onDragEnter={(e) =>
				props.dragDrop.onDragEnter(e, {
					ref: `${props.media.id}`,
					key: MEDIA_SELECT_DRAG_DROP_KEY,
				})
			}
			onDragOver={(e) => props.dragDrop.onDragOver(e)}
		>
			<div
				class={classNames("relative border-b border-border p-3", {
					"rectangle-background":
						props.media.type === "image" || props.media.type === "video",
				})}
			>
				<div class="absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 bg-linear-to-b from-card-base via-card-base/80 to-transparent p-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
					<div class="flex flex-wrap gap-1.5">
						<Show when={props.media.isDeleted}>
							<Pill theme="red">{T()("deleted")}</Pill>
						</Show>
						<Show when={props.dimensions}>
							<Pill theme="outline">{props.dimensions}</Pill>
						</Show>
						<Show when={props.media.mimeType}>
							<Pill theme="outline">{props.media.mimeType}</Pill>
						</Show>
						<Show when={props.media.extension}>
							<Pill theme="outline">{props.media.extension.toUpperCase()}</Pill>
						</Show>
					</div>
				</div>
				<div class="pointer-events-none flex h-40 items-center justify-center [&_img]:max-h-40 [&_img]:h-auto [&_img]:w-auto [&_img]:max-w-full [&_video]:max-h-40 [&_video]:h-auto [&_video]:w-auto [&_video]:max-w-full">
					<MediaPreview
						media={{
							url: props.media.url,
							type: props.media.type,
						}}
						alt={props.alt}
						richPreview={true}
						imageFit="contain"
					/>
				</div>
			</div>
			<div class="flex items-center justify-between gap-2 p-3">
				<div class="min-w-0">
					<p class="line-clamp-1 text-sm font-medium text-subtitle">
						{props.title}
					</p>
					<div class="mt-1">
						<ClickToCopy
							type="simple"
							text={props.media.key || ""}
							value={props.media.url || ""}
							class="text-xs text-unfocused max-w-full"
						/>
					</div>
				</div>

				<div class="opacity-0 transition-opacity duration-200 group-hover:opacity-100">
					<Button
						type="button"
						theme="danger-subtle"
						size="icon-subtle"
						onClick={() => props.removeSelectedMedia(props.media.id)}
						disabled={props.disabled}
						aria-label={T()("remove")}
					>
						<FaSolidXmark size={14} />
					</Button>
				</div>
			</div>
		</div>
	);
};

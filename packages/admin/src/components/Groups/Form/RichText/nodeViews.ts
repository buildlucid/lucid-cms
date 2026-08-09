import {
	LucidEmbeddedBrick,
	LucidMedia,
	LucidVariable,
} from "@lucidcms/rich-text";
import type { MediaRef } from "@types";
import { FaSolidArrowUpRightFromSquare, FaSolidPen } from "solid-icons/fa";
import { render } from "solid-js/web";
import T from "@/translations";
import helpers from "@/utils/helpers";
import { getRichTextDocumentFieldText, getRichTextMediaTypes } from "./helpers";
import type { RichTextOptions } from "./types";

const translatedValue = (
	value: Record<string, string | null> | undefined,
	locale?: string,
) => {
	if (!value) return "";
	if (locale && typeof value[locale] === "string") return value[locale] ?? "";
	return (
		Object.values(value).find(
			(item): item is string => typeof item === "string",
		) ?? ""
	);
};

const createIconButton = (label: string) => {
	const button = document.createElement("button");
	button.type = "button";
	button.className =
		"flex size-9 min-w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-input-base text-body transition-colors hover:border-primary-muted-border hover:bg-card-hover hover:text-primary-base focus-visible:outline-2 focus-visible:outline-primary-base";
	button.setAttribute("aria-label", label);
	button.title = label;
	const dispose = render(() => FaSolidPen({ size: 12 }), button);
	return { button, dispose };
};

const createPill = (label: string, error = false) => {
	const pill = document.createElement("span");
	pill.className = error
		? "inline-flex items-center rounded-full bg-error-base px-2.5 py-0.5 text-xs font-medium leading-4 whitespace-nowrap text-error-contrast"
		: "inline-flex items-center rounded-full border border-white/30 bg-black/35 px-2.5 py-0.5 text-xs font-medium leading-4 whitespace-nowrap text-white backdrop-blur-sm";
	pill.textContent = label;
	return pill;
};

const renderMediaPreview = (
	container: HTMLElement,
	reference: NonNullable<MediaRef>,
	locale?: string,
) => {
	if (reference.type === "image") {
		container.classList.add("rectangle-background");
		const image = document.createElement("img");
		image.src = reference.file.url;
		image.alt =
			translatedValue(reference.alt, locale) ||
			translatedValue(reference.title, locale);
		image.className = "max-h-96 h-auto w-auto max-w-full object-contain";
		container.append(image);
		return;
	}
	if (reference.type === "audio") {
		const audio = document.createElement("audio");
		audio.src = reference.file.url;
		audio.controls = true;
		audio.className = "m-5 w-[calc(100%-2.5rem)]";
		container.append(audio);
		return;
	}
	if (reference.type === "video") {
		container.classList.add("rectangle-background");
		const video = document.createElement("video");
		video.src = reference.file.url;
		if (reference.poster?.file.url) video.poster = reference.poster.file.url;
		video.controls = true;
		video.className =
			"max-h-96 h-auto w-auto max-w-full bg-black object-contain";
		container.append(video);
		return;
	}

	const details = document.createElement("span");
	details.className = "flex min-h-24 w-full flex-col justify-center gap-1 px-5";
	const type = document.createElement("span");
	type.className = "font-medium capitalize text-title";
	type.textContent = reference.type;
	const title = document.createElement("span");
	title.className = "text-sm text-subtitle";
	title.textContent =
		translatedValue(reference.title, locale) ||
		reference.file.fileName ||
		T()("editor.rich.text.media.fallback", { id: reference.id });
	details.append(type, title);
	container.append(details);
};

const addMediaOverlay = (
	container: HTMLElement,
	reference: NonNullable<MediaRef>,
) => {
	const overlay = document.createElement("span");
	overlay.className =
		"pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 bg-linear-to-b from-black/55 via-black/20 to-transparent p-3 opacity-100 transition-opacity duration-200 md:opacity-0 md:group-hover:opacity-100";
	const pills = document.createElement("span");
	pills.className = "flex flex-wrap gap-1.5";
	if (reference.isDeleted) {
		const deleted = createPill(T()("common.status.deleted"), true);
		deleted.title = T()("common.status.deleted.tooltip");
		pills.append(deleted);
	}
	if (!reference.public) {
		const privatePill = createPill(T()("common.private"), true);
		privatePill.title = T()("media.visibility.private.tooltip");
		pills.append(privatePill);
	}
	if (reference.file.meta.fileSize) {
		pills.append(createPill(helpers.bytesToSize(reference.file.meta.fileSize)));
	}
	if (
		(reference.type === "image" || reference.type === "video") &&
		"width" in reference.file.meta &&
		reference.file.meta.width &&
		reference.file.meta.height
	) {
		pills.append(
			createPill(
				`${reference.file.meta.width} × ${reference.file.meta.height}`,
			),
		);
	}
	if (reference.file.meta.extension) {
		pills.append(createPill(reference.file.meta.extension.toUpperCase()));
	}

	const externalLink = document.createElement("a");
	externalLink.href = reference.file.url;
	externalLink.target = "_blank";
	externalLink.rel = "noopener noreferrer";
	externalLink.className =
		"pointer-events-auto flex size-8 min-w-8 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition-colors hover:bg-black/55 hover:text-white focus-visible:outline-2 focus-visible:outline-white";
	externalLink.setAttribute("aria-label", T()("common.open.in.new.tab"));
	externalLink.title = T()("common.open.in.new.tab");
	externalLink.addEventListener("click", (event) => event.stopPropagation());
	const dispose = render(
		() => FaSolidArrowUpRightFromSquare({ size: 13 }),
		externalLink,
	);
	overlay.append(pills, externalLink);
	container.append(overlay);
	return dispose;
};

/** Builds editor node views for Lucid reference nodes. */
export const createRichTextNodeViewExtensions = (options?: RichTextOptions) => [
	LucidMedia.extend({
		addNodeView() {
			return ({ node, editor, getPos }) => {
				const mediaId = node.attrs.mediaId;
				const reference =
					typeof mediaId === "number"
						? options?.references?.media?.(mediaId)
						: undefined;
				const root = document.createElement("div");
				root.contentEditable = "false";
				root.className =
					"group my-3 flex w-full select-none items-center gap-3 rounded-xl border border-border bg-card-base p-3";
				root.dataset.lucidRichTextMedia = "";
				const preview = document.createElement("span");
				preview.className =
					"relative flex min-h-24 min-w-0 grow items-center justify-center overflow-hidden rounded-xl border border-border bg-input-base";
				const disposers: Array<() => void> = [];
				if (reference?.file.url) {
					renderMediaPreview(preview, reference, options?.locale);
					disposers.push(addMediaOverlay(preview, reference));
				} else {
					root.classList.add(
						"border-error-base/50",
						"bg-linear-to-b",
						"from-error-base/10",
						"to-card-base",
						"to-30%",
					);
					preview.classList.add("border-error-base/50");
					const unavailable = document.createElement("span");
					unavailable.className = "px-5 py-8 text-sm text-error-base";
					unavailable.textContent = T()("editor.rich.text.media.unavailable");
					preview.append(unavailable);
				}
				const { button: edit, dispose } = createIconButton(
					T()("editor.rich.text.media.edit"),
				);
				disposers.push(dispose);
				root.append(preview, edit);
				edit.addEventListener("click", (event) => {
					event.preventDefault();
					event.stopPropagation();
					if (!editor.isEditable || typeof mediaId !== "number") return;
					options?.callbacks?.selectMedia?.({
						currentId: mediaId,
						allowedTypes: getRichTextMediaTypes(options?.media),
						onSelect: (nextId) => {
							const position = getPos();
							if (typeof position !== "number") return;
							editor.view.dispatch(
								editor.view.state.tr.setNodeMarkup(position, undefined, {
									mediaId: nextId,
								}),
							);
						},
					});
				});
				return {
					dom: root,
					destroy: () =>
						disposers.forEach((dispose) => {
							dispose();
						}),
				};
			};
		},
	}),
	LucidVariable.extend({
		addNodeView() {
			return ({ node, editor, getPos }) => {
				const { collectionKey, documentId, fieldKey } = node.attrs;
				const reference =
					typeof collectionKey === "string" && typeof documentId === "number"
						? options?.references?.document?.(collectionKey, documentId)
						: undefined;
				const value =
					reference && typeof fieldKey === "string"
						? getRichTextDocumentFieldText(reference, fieldKey, options?.locale)
						: "";
				const available = value.length > 0;
				const root = document.createElement("span");
				root.contentEditable = "false";
				root.className = available
					? "mx-0.5 inline-flex select-none items-center gap-1 rounded-full border border-primary-muted-border bg-primary-muted-bg py-0.5 pr-1 pl-2 align-baseline text-sm text-primary-muted-contrast"
					: "mx-0.5 inline-flex select-none items-center gap-1 rounded-full border border-error-base/30 bg-error-base/10 py-0.5 pr-1 pl-2 align-baseline text-sm text-error-base";
				root.dataset.lucidRichTextVariable = "";
				const label = document.createElement("span");
				label.className = "text-current";
				label.textContent =
					value ||
					String(fieldKey ?? T()("editor.rich.text.variable.unavailable"));
				const edit = document.createElement("button");
				edit.type = "button";
				edit.className =
					"shrink-0 cursor-pointer select-none rounded-full px-1.5 py-0.5 text-xs text-current hover:bg-current/10 focus-visible:outline-2 focus-visible:outline-current";
				edit.textContent = T()("common.edit");
				edit.setAttribute("aria-label", T()("editor.rich.text.variable.edit"));
				root.append(label, edit);
				edit.addEventListener("click", (event) => {
					event.preventDefault();
					event.stopPropagation();
					if (
						!editor.isEditable ||
						typeof collectionKey !== "string" ||
						typeof documentId !== "number" ||
						typeof fieldKey !== "string"
					) {
						return;
					}
					options?.callbacks?.selectVariable?.({
						current: { collectionKey, documentId, fieldKey },
						onSelect: (selection) => {
							const position = getPos();
							if (typeof position !== "number") return;
							editor.view.dispatch(
								editor.view.state.tr.setNodeMarkup(position, undefined, {
									collectionKey: selection.collectionKey,
									documentId: selection.documentId,
									fieldKey: selection.fieldKey,
								}),
							);
						},
					});
				});
				return { dom: root };
			};
		},
	}),
	LucidEmbeddedBrick.extend({
		addNodeView() {
			return ({ node, editor }) => {
				const ref = node.attrs.ref;
				const brick =
					typeof ref === "string"
						? options?.references?.embeddedBrick?.(ref)
						: undefined;
				const config = options?.embeddedBrickConfigs?.find(
					(item) => item.key === brick?.key,
				);
				const available = brick !== undefined && config !== undefined;
				const root = document.createElement("div");
				root.contentEditable = "false";
				root.className = available
					? "group my-3 flex w-full cursor-pointer select-none items-center gap-3 rounded-xl border border-border bg-card-base p-3 text-left hover:border-primary-muted-border focus-visible:outline-2 focus-visible:outline-primary-base/30"
					: "group my-3 flex w-full cursor-pointer select-none items-center gap-3 rounded-xl border border-error-base/50 bg-linear-to-b from-error-base/10 to-card-base to-30% p-3 text-left focus-visible:outline-2 focus-visible:outline-error-base/30";
				root.dataset.lucidRichTextBrick = "";
				root.tabIndex = 0;
				root.setAttribute("role", "button");
				root.setAttribute("aria-label", T()("editor.rich.text.brick.edit"));
				const content = document.createElement("span");
				content.className = available
					? "flex min-h-20 min-w-0 grow flex-col justify-center rounded-xl border border-border bg-input-base px-5 py-4"
					: "flex min-h-20 min-w-0 grow flex-col justify-center rounded-xl border border-error-base/50 bg-input-base px-5 py-4";
				const label = document.createElement("span");
				label.className = available
					? "text-sm font-medium text-title"
					: "text-sm font-medium text-error-base";
				label.textContent = available
					? helpers.getLocaleValue({
							value: config.details.name,
							fallback: brick.key,
						})
					: T()("editor.rich.text.brick.unavailable");
				content.append(label);
				const summary = available
					? helpers.getLocaleValue({ value: config.details.summary })
					: "";
				if (summary) {
					const description = document.createElement("span");
					description.className = "mt-1 line-clamp-2 text-sm text-subtitle";
					description.textContent = summary;
					content.append(description);
				}
				const { button: edit, dispose } = createIconButton(
					T()("editor.rich.text.brick.edit"),
				);
				root.append(content, edit);
				const openEditor = (event: Event) => {
					event.preventDefault();
					event.stopPropagation();
					if (!editor.isEditable || typeof ref !== "string" || !available)
						return;
					options?.callbacks?.editEmbeddedBrick?.(ref);
				};
				root.addEventListener("click", openEditor);
				root.addEventListener("keydown", (event) => {
					if (event.key !== "Enter" && event.key !== " ") return;
					openEditor(event);
				});
				return { dom: root, destroy: dispose };
			};
		},
	}),
];

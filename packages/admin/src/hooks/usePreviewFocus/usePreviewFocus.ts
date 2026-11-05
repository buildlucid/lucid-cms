import { useNavigate } from "@solidjs/router";
import { formatForDisplay, resolveModifier } from "@tanstack/solid-hotkeys";
import type { Collection } from "@types";
import { type Accessor, createEffect, createSignal, onCleanup } from "solid-js";
import { useBrickStore } from "@/hooks/useBrickStore/useBrickStore";
import type { PreviewTarget } from "@/preview/protocol";
import contentLocaleStore from "@/store/contentLocaleStore/contentLocaleStore";
import siteStore from "@/store/siteStore/siteStore";
import T from "@/translations";
import { getDocumentPreviewLabel } from "@/utils/document-table-helpers";
import { findLinkedDocument } from "@/utils/find-linked-document";
import {
	findPreviewFocusTarget,
	revealPreviewField,
} from "@/utils/preview-focus-dom";
import { getDocumentRoute } from "@/utils/route-helpers";
import spawnToast from "@/utils/spawn-toast";
import { getBuilderPreviewTarget } from "./utils/get-builder-preview-target";
import { resolvePreviewFieldTarget } from "./utils/resolve-preview-field-target";

//* how long another document opened from the page waits for its editor to load
const HANDOFF_MS = 15_000;

/** Another document opened from the page, with the locale and field to show once its editor has its content. */
type Handoff = {
	collectionKey: string;
	documentId: number;
	locale: string | null;
	target: PreviewTarget | null;
	until: number;
};

let handoff: Handoff | null = null;

/**
 * Synchronizes builder and preview focus. Closes automatically opened sections when selection
 * leaves them, unless the user has toggled them. Other documents, picked or linked to on the page,
 * open in their own editor.
 */
export const usePreviewFocus = (props: {
	collection: Accessor<Collection | undefined>;
	collectionKey: Accessor<string>;
	documentId: Accessor<number | undefined>;
	locales: Accessor<string[]>;
	/** Whether the editor has loaded the document's content, which fields are found in. */
	ready: Accessor<boolean>;
	/** The collections the person can read, whose documents the page can open. */
	collections: Accessor<Collection[]>;
}) => {
	const brickStore = useBrickStore();
	const navigate = useNavigate();
	let revealController: AbortController | undefined;
	let clearHighlight: (() => void) | undefined;
	//* a new object for every focus, so focusing the same field again points it out again
	const [builderTarget, setBuilderTarget] = createSignal<PreviewTarget | null>(
		null,
		{ equals: false },
	);
	//* the triggers of what preview targets opened, kept by element so a brick moving doesn't change which one it is
	const opened = new Set<HTMLElement>();

	/** Closes what preview targets opened, apart from the triggers in `keep`, which the next target needs. */
	const closeOpened = (keep: ReadonlySet<Element> = new Set()) => {
		for (const trigger of opened) {
			if (keep.has(trigger)) continue;
			opened.delete(trigger);
			if (trigger.isConnected && trigger.dataset.previewFocusOpen === "true") {
				trigger.click();
			}
		}
	};
	//* Preserve manual toggles. Ignore synthetic reveal clicks and drag handles; wait for handlers before checking state.
	const onToggle = (event: Event) => {
		if (!event.isTrusted || !(event.target instanceof Element)) return;
		const trigger = event.target.closest("[data-preview-focus-open]");
		if (!(trigger instanceof HTMLElement) || !opened.has(trigger)) return;
		const before = trigger.dataset.previewFocusOpen;
		setTimeout(() => {
			if (trigger.dataset.previewFocusOpen !== before) opened.delete(trigger);
		});
	};

	const cancelReveal = () => {
		revealController?.abort();
		revealController = undefined;
		clearHighlight?.();
		clearHighlight = undefined;
	};
	const notify = (message: string) => {
		spawnToast({
			title: T()("preview.focus.unavailable.title"),
			message,
			status: "warning",
		});
	};
	/** Opens another document's editor, which then shows the locale and field asked for. */
	const openDocument = (next: Omit<Handoff, "until">) => {
		handoff = { ...next, until: Date.now() + HANDOFF_MS };
		navigate(
			getDocumentRoute("edit", {
				collectionKey: next.collectionKey,
				documentId: next.documentId,
			}),
		);
	};
	/** Offers to open the editor of the document a target belongs to, which shows the target once it loads. */
	const offerOtherDocument = (target: PreviewTarget) => {
		const canOpen = props
			.collections()
			.some((collection) => collection.key === target.collectionKey);
		spawnToast({
			title: T()("preview.focus.other.title"),
			message: T()(
				canOpen ? "preview.focus.other.message" : "preview.focus.other.denied",
			),
			action: canOpen
				? {
						label: T()("preview.focus.other.open"),
						icon: "pen",
						onClick: () =>
							openDocument({
								collectionKey: target.collectionKey,
								documentId: target.documentId,
								locale: target.locale ?? null,
								target,
							}),
					}
				: undefined,
		});
	};
	/** Says a link on the page wasn't followed, offering to open the document it goes to when that's another one the person can read. */
	const explainLink = async (href: string | null) => {
		const linked = href
			? await findLinkedDocument({
					url: new URL(href),
					siteUrl: siteStore.get.siteUrl,
					collections: props.collections(),
				})
			: null;
		//* the platform's own modifier, eg. ⌘ on a Mac
		const key = formatForDisplay(resolveModifier("Mod"));
		if (
			!linked ||
			(linked.document.collectionKey === props.collectionKey() &&
				linked.document.id === props.documentId())
		) {
			spawnToast({
				title: T()("preview.navigation.locked.title"),
				message: T()("preview.navigation.locked.message", { key }),
				icon: "link",
			});
			return;
		}
		const name = getDocumentPreviewLabel({
			collection: linked.collection,
			document: linked.document,
			contentLocale:
				linked.locale ?? contentLocaleStore.get.contentLocale ?? "",
		});
		spawnToast({
			title: T()("preview.link.title", { name }),
			message: T()("preview.link.message", { key }),
			icon: "link",
			action: {
				label: T()("preview.focus.other.open"),
				icon: "pen",
				onClick: () =>
					openDocument({
						collectionKey: linked.document.collectionKey,
						documentId: linked.document.id,
						locale: linked.locale,
						target: null,
					}),
			},
		});
	};
	/** Opens a field, item or brick in the builder. `activate` also opens a field's picker, or puts the cursor in it. */
	const requestTarget = async (
		target: PreviewTarget,
		options?: { activate?: boolean },
	) => {
		const documentId = props.documentId();
		if (
			target.collectionKey !== props.collectionKey() ||
			documentId === undefined ||
			target.documentId !== documentId
		) {
			offerOtherDocument(target);
			return;
		}

		const collection = props.collection();
		if (!collection) {
			notify(T()("preview.focus.missing"));
			return;
		}
		const resolution = resolvePreviewFieldTarget({
			target,
			collection,
			bricks: brickStore.get.bricks,
		});
		if (!resolution) {
			notify(T()("preview.focus.missing"));
			return;
		}

		cancelReveal();
		closeOpened(
			new Set(
				resolution.structureIds.flatMap((id) => {
					const trigger = document.getElementById(id);
					return trigger ? [trigger] : [];
				}),
			),
		);
		if (target.locale && props.locales().includes(target.locale)) {
			contentLocaleStore.get.setContentLocale(target.locale);
		}
		const controller = new AbortController();
		revealController = controller;
		const cleanup = await revealPreviewField({
			fieldId: resolution.fieldId,
			structureIds: resolution.structureIds,
			signal: controller.signal,
			activate: options?.activate,
			onOpen: (trigger) => opened.add(trigger),
		});
		if (controller.signal.aborted || revealController !== controller) {
			cleanup?.();
			return;
		}
		if (!cleanup) {
			revealController = undefined;
			notify(T()("preview.focus.missing"));
			return;
		}
		clearHighlight = cleanup;
	};

	const onFocusIn = (event: FocusEvent) => {
		const collection = props.collection();
		const documentId = props.documentId();
		if (!(event.target instanceof Element) || !collection || !documentId) {
			return;
		}
		const focused = findPreviewFocusTarget(event.target, brickStore.idPrefix);
		const brick = focused ? brickStore.get.bricks[focused.brickIndex] : null;
		if (!focused || !brick) return;

		const target = getBuilderPreviewTarget({
			collectionKey: props.collectionKey(),
			documentId,
			collection,
			brick,
			path: focused.path,
		});
		if (target) setBuilderTarget(target);
	};

	//* another document opened from the page shows its locale and field once its own editor has loaded
	createEffect(() => {
		if (!props.ready() || !handoff) return;
		const opening = handoff;
		if (
			opening.collectionKey !== props.collectionKey() ||
			opening.documentId !== props.documentId()
		) {
			if (Date.now() > opening.until) handoff = null;
			return;
		}
		handoff = null;
		if (opening.locale && props.locales().includes(opening.locale)) {
			contentLocaleStore.get.setContentLocale(opening.locale);
		}
		if (opening.target) void requestTarget(opening.target);
	});

	document.addEventListener("focusin", onFocusIn);
	document.addEventListener("click", onToggle, true);
	document.addEventListener("keydown", onToggle, true);
	onCleanup(() => {
		cancelReveal();
		opened.clear();
		document.removeEventListener("focusin", onFocusIn);
		document.removeEventListener("click", onToggle, true);
		document.removeEventListener("keydown", onToggle, true);
	});
	return {
		requestTarget,
		explainLink,
		builderTarget,
		/** Points out a field, brick or repeater item on the page, eg. one just added. */
		pointOut: (target: PreviewTarget) => setBuilderTarget(target),
		/** The page cleared its selection, so what preview targets opened closes again. */
		deselect: () => {
			cancelReveal();
			closeOpened();
		},
		/** Leaves what preview targets opened as it is, eg. once the preview closes. */
		forgetOpened: () => opened.clear(),
	};
};

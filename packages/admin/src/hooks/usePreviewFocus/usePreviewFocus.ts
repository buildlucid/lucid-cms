import type { Collection } from "@types";
import { type Accessor, createSignal, onCleanup } from "solid-js";
import { useBrickStore } from "@/hooks/useBrickStore/useBrickStore";
import type { PreviewFieldTarget } from "@/preview/protocol";
import contentLocaleStore from "@/store/contentLocaleStore/contentLocaleStore";
import T from "@/translations";
import {
	findPreviewFocusTarget,
	revealPreviewField,
} from "@/utils/preview-focus-dom";
import spawnToast from "@/utils/spawn-toast";
import { getBuilderPreviewTarget } from "./utils/get-builder-preview-target";
import { resolvePreviewFieldTarget } from "./utils/resolve-preview-field-target";

/**
 * Synchronizes builder and preview focus. Closes automatically opened sections when selection
 * leaves them, unless the user has toggled them.
 */
export const usePreviewFocus = (props: {
	collection: Accessor<Collection | undefined>;
	collectionKey: Accessor<string>;
	documentId: Accessor<number | undefined>;
	locales: Accessor<string[]>;
	/** Whether the preview shows saved content while there are unsaved edits, so repeater items may be in other positions. */
	previewBehind: Accessor<boolean>;
}) => {
	const brickStore = useBrickStore();
	let revealController: AbortController | undefined;
	let clearHighlight: (() => void) | undefined;
	//* a new object for every focus, so focusing the same field again points it out again
	const [builderTarget, setBuilderTarget] =
		createSignal<PreviewFieldTarget | null>(null, { equals: false });
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
	/** Opens a field, item or brick in the builder. `activate` also opens a field's picker, or puts the cursor in it. */
	const requestTarget = async (
		target: PreviewFieldTarget,
		options?: { activate?: boolean },
	) => {
		const documentId = props.documentId();
		if (
			target.collectionKey !== props.collectionKey() ||
			documentId === undefined ||
			target.documentId !== documentId
		) {
			notify(T()("preview.focus.different.document"));
			return;
		}

		if (
			props.previewBehind() &&
			target.path.some((segment) => typeof segment === "number")
		) {
			notify(T()("preview.focus.dirty.repeater"));
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
		builderTarget,
		/** Points out a field, brick or repeater item on the page, eg. one just added. */
		pointOut: (target: PreviewFieldTarget) => setBuilderTarget(target),
		/** The page cleared its selection, so what preview targets opened closes again. */
		deselect: () => {
			cancelReveal();
			closeOpened();
		},
		/** Leaves what preview targets opened as it is, eg. once the preview closes. */
		forgetOpened: () => opened.clear(),
	};
};

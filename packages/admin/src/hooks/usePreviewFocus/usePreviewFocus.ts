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
 * Synchronizes focus: preview targets open builder fields, and builder focus sets the highlighted
 * preview target.
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
	onCleanup(() => {
		cancelReveal();
		document.removeEventListener("focusin", onFocusIn);
	});
	return {
		requestTarget,
		builderTarget,
		/** Points out a field, brick or repeater item on the page, eg. one just added. */
		pointOut: (target: PreviewFieldTarget) => setBuilderTarget(target),
	};
};

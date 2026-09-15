import type { PreviewFieldTarget } from "@lucidcms/preview-protocol";
import type { Collection } from "@types";
import { type Accessor, onCleanup } from "solid-js";
import brickStore from "@/store/brickStore/brickStore";
import contentLocaleStore from "@/store/contentLocaleStore/contentLocaleStore";
import T from "@/translations";
import { revealPreviewField } from "@/utils/preview-focus-dom";
import spawnToast from "@/utils/spawn-toast";
import { resolvePreviewFieldTarget } from "./utils/resolve-preview-field-target";

/** Coordinates preview target validation, reveal state, and DOM highlighting. */
export const usePreviewFocus = (props: {
	collection: Accessor<Collection | undefined>;
	collectionKey: Accessor<string>;
	documentId: Accessor<number | undefined>;
	locales: Accessor<string[]>;
	hasUnsavedContent: Accessor<boolean>;
	hasUnsavedBuilderStructure: Accessor<boolean>;
}) => {
	let revealController: AbortController | undefined;
	let clearHighlight: (() => void) | undefined;

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
	const requestTarget = async (target: PreviewFieldTarget) => {
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
			props.hasUnsavedContent() &&
			target.path.some((segment) => typeof segment === "number")
		) {
			notify(T()("preview.focus.dirty.repeater"));
			return;
		}
		if (
			props.hasUnsavedBuilderStructure() &&
			target.brick?.type === "builder"
		) {
			notify(T()("preview.focus.dirty.brick"));
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

	onCleanup(cancelReveal);
	return { requestTarget };
};

import type { Collection } from "@types";
import { type Accessor, onCleanup, onMount } from "solid-js";
import { useBrickStore } from "@/hooks/useBrickStore/useBrickStore";
import type { BrickData } from "@/store/brickStore/brickStore";
import type {
	BricksEditState,
	EditEntry,
	FieldEditTarget,
} from "@/store/brickStore/utils/edit-stack";
import contentLocaleStore from "@/store/contentLocaleStore/contentLocaleStore";
import {
	type BuilderFieldTarget,
	getBuilderFieldPath,
	getChangedFieldPaths,
	highlightBuilderFields,
} from "@/utils/builder-reveal";
import getEditShortcut from "@/utils/edit-shortcut";
import { inModal } from "@/utils/shortcuts";

/** Editors with their own undo history, eg. rich text and code, mark themselves so they get the shortcut first while focused. */
const ownsUndoSelector = "[data-owns-undo]";
/** The builder marks itself so its inputs, which write straight to the document, hand the shortcut to it rather than the browser. */
const documentBuilderSelector = "[data-document-builder]";

type EditDirection = "undo" | "redo";

const isEditable = (element: Element) =>
	element.matches("input, textarea, select") ||
	(element instanceof HTMLElement && element.isContentEditable);

/** Finds the field a step changed in the bricks as they are now. */
const fieldTargets = (
	bricks: BrickData[],
	target: FieldEditTarget,
): BuilderFieldTarget[] => {
	const brickIndex = bricks.findIndex(
		(candidate) => candidate.ref === target.brickRef,
	);
	const brick = bricks[brickIndex];
	const path =
		brick && getBuilderFieldPath(brick.fields, target.key, target.groupRef);
	return path ? [{ brickIndex, path }] : [];
};

/** Identifies changed fields and restored or moved builder brick headers in the current structure. */
const bricksTargets = (
	bricks: BrickData[],
	reached: BricksEditState,
	left: BricksEditState,
): BuilderFieldTarget[] => {
	//* only bricks on both sides count, so adding or removing one doesn't look like the rest moved
	const kept = (from: BricksEditState, other: BricksEditState) =>
		from.layout
			.filter(
				(item) =>
					item.type === "builder" &&
					other.layout.some((candidate) => candidate.ref === item.ref),
			)
			.map((item) => item.ref);
	const reachedOrder = kept(reached, left);
	const leftOrder = kept(left, reached);

	return bricks.flatMap((brick, brickIndex): BuilderFieldTarget[] => {
		if (!left.layout.some((item) => item.ref === brick.ref)) {
			return [{ brickIndex, path: [] }];
		}

		const moved =
			brick.type === "builder" &&
			reachedOrder.indexOf(brick.ref) !== leftOrder.indexOf(brick.ref);
		const now = reached.fields[brick.ref];
		const before = left.fields[brick.ref];
		const changed =
			now && before
				? getChangedFieldPaths(now, before).map((path) => ({
						brickIndex,
						path,
					}))
				: [];
		return moved ? [{ brickIndex, path: [] }, ...changed] : changed;
	});
};

/** Provides document undo and redo, prioritizing editors with their own history and highlighting changes in their edited language while scrolling only when none are visible. */
export const useBuilderEdits = (props: {
	/** Whether the person can edit the document here right now. */
	enabled: Accessor<boolean>;
	collection: Accessor<Collection | undefined>;
	collectionKey: Accessor<string>;
	documentId: Accessor<number | undefined>;
	locales: Accessor<string[]>;
}) => {
	// ----------------------------------------
	// State & Hooks
	const brickStore = useBrickStore();

	// ----------------------------------------
	// Functions
	const reveal = (entry: EditEntry, direction: EditDirection) => {
		const collection = props.collection();
		if (!collection) return;

		if (
			entry.kind === "field" &&
			entry.target.locale !== undefined &&
			props.locales().includes(entry.target.locale)
		) {
			contentLocaleStore.get.setContentLocale(entry.target.locale);
		}

		//* the builder renders the step's changes, and any language switch, before they can be found
		requestAnimationFrame(() => {
			const bricks = brickStore.get.bricks;
			highlightBuilderFields(
				{
					collection,
					collectionKey: props.collectionKey(),
					documentId: props.documentId(),
					bricks,
				},
				entry.kind === "field"
					? fieldTargets(bricks, entry.target)
					: bricksTargets(
							bricks,
							direction === "undo" ? entry.before : entry.after,
							direction === "undo" ? entry.after : entry.before,
						),
			);
		});
	};
	const step = (direction: EditDirection) => {
		if (!props.enabled()) return;
		const entry =
			direction === "undo" ? brickStore.edits.undo() : brickStore.edits.redo();
		if (entry) reveal(entry, direction);
	};
	const handleKeyDown = (event: KeyboardEvent, phase: "capture" | "bubble") => {
		if (!props.enabled()) return;
		const direction = getEditShortcut(event);
		if (!direction) return;

		const target = event.target instanceof Element ? event.target : null;
		const owned = target?.closest(ownsUndoSelector) != null;
		//* an editor with its own history takes the key on the way down, and passes it on when it had nothing to undo
		if (phase === "capture" ? owned : !owned || event.defaultPrevented) return;
		//* dialogs have their own inputs and ways back
		if (inModal()) return;
		//* inputs elsewhere, eg. the agent's composer, keep the browser's undo
		if (
			target &&
			isEditable(target) &&
			!target.closest(documentBuilderSelector)
		) {
			return;
		}

		event.preventDefault();
		//* an editor with focus ignores outside changes to protect its cursor, so it lets go before the step can change its field
		if (owned && document.activeElement instanceof HTMLElement) {
			document.activeElement.blur();
		}
		step(direction);
	};

	// ----------------------------------------
	// Effects
	onMount(() => {
		const capture = (event: KeyboardEvent) => handleKeyDown(event, "capture");
		const bubble = (event: KeyboardEvent) => handleKeyDown(event, "bubble");
		window.addEventListener("keydown", capture, true);
		window.addEventListener("keydown", bubble);
		onCleanup(() => {
			window.removeEventListener("keydown", capture, true);
			window.removeEventListener("keydown", bubble);
		});
	});

	// ----------------------------------------
	// Return
	return {
		undo: () => step("undo"),
		redo: () => step("redo"),
		canUndo: () => props.enabled() && brickStore.edits.canUndo(),
		canRedo: () => props.enabled() && brickStore.edits.canRedo(),
	};
};

export type UseBuilderEdits = ReturnType<typeof useBuilderEdits>;

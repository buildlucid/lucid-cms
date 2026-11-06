import type { Collection } from "@types";
import { type Accessor, createMemo } from "solid-js";
import { useBrickStore } from "@/hooks/useBrickStore/useBrickStore";
import { getBuilderPreviewTarget } from "@/hooks/usePreviewFocus/utils/get-builder-preview-target";
import {
	isPreviewItem,
	type PreviewDragged,
	type PreviewPlace,
	type PreviewTarget,
} from "@/preview/protocol";
import type { BrickData } from "@/store/brickStore/brickStore";
import T from "@/translations";
import { findPreviewBrick } from "@/utils/find-preview-brick";
import resolveFieldAccess from "@/utils/resolve-field-access";
import spawnToast from "@/utils/spawn-toast";
import { resolveRepeater } from "./utils/resolve-repeater";

/**
 * A change to the preview's bricks or repeater items. Adding goes next to a brick or item, or
 * at either end of a repeater targeted as a field. Moving puts the target next to a sibling
 * `anchor`.
 */
export type PreviewStructureChange =
	| { action: "add"; place: PreviewPlace; brickKey?: string }
	| { action: "move"; place: PreviewPlace; anchor: PreviewTarget }
	| { action: "remove" };

/** How many items a repeater has and can have, and whether the user can add one now. */
export type PreviewRepeaterCapacity = {
	count: number;
	max: number | null;
	canAdd: boolean;
};

type Change<TAction extends PreviewStructureChange["action"]> = Extract<
	PreviewStructureChange,
	{ action: TAction }
>;

/** Where `ref` goes in `refs` once taken out, to sit before or after `anchor`. */
const positionNextTo = (
	refs: string[],
	ref: string,
	anchor: string,
	place: "before" | "after",
) => {
	const rest = refs.filter((item) => item !== ref);
	const index = rest.indexOf(anchor);
	if (index === -1) return null;
	return place === "before" ? index : index + 1;
};

/**
 * Applies preview changes using builder locks and permissions. Opens added bricks and items.
 * Returns undo steps valid only until the next change.
 */
export const usePreviewStructure = (props: {
	collection: Accessor<Collection | undefined>;
	collectionKey: Accessor<string>;
	documentId: Accessor<number | undefined>;
	locales: Accessor<string[]>;
	/** Whether bricks and repeater items can be added, moved and removed. Locale-limited proposals keep the stored ones. */
	canChange: Accessor<boolean>;
	/** Opens a brick or repeater item in the builder and points it out on the page. */
	reveal: (target: PreviewTarget) => void;
}) => {
	const brickStore = useBrickStore();

	const notify = (message: string) => {
		spawnToast({
			title: T()("preview.structure.title"),
			message,
			status: "warning",
		});
	};
	/** The undo step the change just made. */
	const changed = () => brickStore.get.editRevision;

	const changeBrick = (
		collection: Collection,
		target: PreviewTarget,
		change: PreviewStructureChange,
	): number | null => {
		const ref = target.brick?.ref;
		const index = brickStore.get.bricks.findIndex(
			(brick) => brick.type === "builder" && brick.ref === ref,
		);
		const brick = brickStore.get.bricks[index];
		if (!brick) {
			notify(T()("preview.structure.missing"));
			return null;
		}

		if (change.action === "move") {
			const ordered = brickStore.get.bricks
				.filter((item) => item.type === "builder")
				.sort((a, b) => a.order - b.order)
				.map((item) => item.ref);
			const position = change.anchor.brick
				? positionNextTo(
						ordered,
						brick.ref,
						change.anchor.brick.ref,
						change.place,
					)
				: null;
			if (position === null) {
				notify(T()("preview.structure.missing"));
				return null;
			}
			brickStore.get.moveBrick({ brickRef: brick.ref, index: position });
			return changed();
		}

		if (change.action === "remove") {
			const config = collection.builderBricks.find(
				(item) => item.key === brick.key,
			);
			if (resolveFieldAccess(config?.permissions) !== "editable") {
				notify(T()("preview.structure.denied"));
				return null;
			}
			brickStore.get.removeBrick(index);
			return changed();
		}

		return addBrick(collection, brick, change);
	};

	const addBrick = (
		collection: Collection,
		next: BrickData,
		change: Change<"add">,
	): number | null => {
		const config = collection.builderBricks.find(
			(item) => item.key === change.brickKey,
		);
		const documentId = props.documentId();
		if (
			!config ||
			documentId === undefined ||
			resolveFieldAccess(config.permissions) !== "editable"
		) {
			notify(T()("preview.structure.denied"));
			return null;
		}
		const ref = brickStore.get.addBrick({
			brickConfig: config,
			locales: props.locales(),
			order: change.place === "before" ? next.order : next.order + 1,
		});
		props.reveal({
			collectionKey: props.collectionKey(),
			documentId,
			brick: { type: "builder", key: config.key, ref },
			path: [],
		});
		return changed();
	};

	/** The repeater a target is, or is an item of, with its brick's place in the store. */
	const findRepeater = (collection: Collection, target: PreviewTarget) => {
		const found = findPreviewBrick({
			target,
			collection,
			bricks: brickStore.get.bricks,
		});
		if (!found) return null;
		const resolved = resolveRepeater({
			configs: found.configs,
			fields: found.brick.fields,
			path: target.path,
			access: found.access,
		});
		return resolved ? { ...resolved, brickIndex: found.brickIndex } : null;
	};

	const changeRepeater = (
		collection: Collection,
		target: PreviewTarget,
		change: PreviewStructureChange,
	): number | null => {
		const resolved = findRepeater(collection, target);
		if (!resolved) {
			notify(T()("preview.structure.missing"));
			return null;
		}
		const { scope, group, brickIndex } = resolved;
		if (!scope.editable) {
			notify(T()("preview.structure.denied"));
			return null;
		}
		const location = {
			brickIndex,
			repeaterKey: scope.repeaterKey,
			ref: scope.parentRef,
			parentRepeaterKey: scope.parentRepeaterKey,
		};
		if (change.action === "add") {
			const max = scope.config.validation?.maxGroups;
			const documentId = props.documentId();
			if (documentId === undefined) return null;
			if (max !== undefined && scope.groups.length >= max) {
				notify(T()("preview.structure.full"));
				return null;
			}
			const index = group ? scope.groups.indexOf(group) : null;
			const position =
				index === null
					? change.place === "before"
						? 0
						: scope.groups.length
					: change.place === "before"
						? index
						: index + 1;
			const ref = brickStore.get.addRepeaterGroup({
				brickIndex,
				fieldConfig: scope.config.fields,
				key: scope.repeaterKey,
				ref: scope.parentRef,
				parentRepeaterKey: scope.parentRepeaterKey,
				locales: props.locales(),
				index: position,
			});
			if (ref) {
				props.reveal({
					...target,
					path: [...(group ? target.path.slice(0, -1) : target.path), { ref }],
				});
			}
			return changed();
		}

		if (!group) {
			notify(T()("preview.structure.missing"));
			return null;
		}
		if (change.action === "remove") {
			brickStore.get.removeRepeaterGroup({ ...location, targetRef: group.ref });
			return changed();
		}

		const anchor = change.anchor.path.at(-1);
		const position = isPreviewItem(anchor)
			? positionNextTo(
					scope.groups.map((item) => item.ref),
					group.ref,
					anchor.ref,
					change.place,
				)
			: null;
		if (position === null) {
			notify(T()("preview.structure.missing"));
			return null;
		}
		brickStore.get.moveRepeaterGroup({
			...location,
			groupRef: group.ref,
			index: position,
		});
		return changed();
	};

	const dragged = createMemo(
		(): PreviewDragged | null => {
			const drag = brickStore.get.structureDrag;
			const collection = props.collection();
			const documentId = props.documentId();
			if (!drag || !collection || documentId === undefined) return null;
			const { repeater } = drag;
			const builderBricks = brickStore.get.bricks
				.filter((brick) => brick.type === "builder")
				.sort((a, b) => a.order - b.order);
			const targetAt = (index: number) => {
				const brick = repeater
					? brickStore.get.bricks[repeater.brickIndex]
					: builderBricks[index];
				if (!brick || index < 0) return null;
				return getBuilderPreviewTarget({
					collectionKey: props.collectionKey(),
					documentId,
					collection,
					brick,
					path: repeater ? [...repeater.path, index] : [],
				});
			};
			const target = targetAt(drag.from);
			const anchor = drag.over === drag.from ? null : targetAt(drag.over);
			if (!target) return null;
			return {
				target,
				//* Insert after a lower sibling or before a higher one to occupy its index.
				landing: anchor
					? { anchor, place: drag.over > drag.from ? "after" : "before" }
					: null,
			};
		},
		null,
		{ equals: (a, b) => JSON.stringify(a) === JSON.stringify(b) },
	);

	return {
		dragged,
		/** Applies a change, returning its undo step, or null when it made none. */
		handle: (
			target: PreviewTarget,
			change: PreviewStructureChange,
		): number | null => {
			const collection = props.collection();
			if (
				!collection ||
				brickStore.get.locked ||
				target.collectionKey !== props.collectionKey() ||
				target.documentId !== props.documentId()
			) {
				return null;
			}
			//* page moves, eg. ⌥ and the arrow keys, reach here even when the controls are hidden
			if (!props.canChange()) {
				notify(T()("preview.structure.locales"));
				return null;
			}
			return target.path.length === 0
				? changeBrick(collection, target, change)
				: changeRepeater(collection, target, change);
		},
		/** How many items a repeater, or an item's repeater, has and can have. Null when it isn't found. */
		capacity: (target: PreviewTarget): PreviewRepeaterCapacity | null => {
			const collection = props.collection();
			const resolved = collection ? findRepeater(collection, target) : null;
			if (!resolved) return null;
			const { groups, config, editable } = resolved.scope;
			const max = config.validation?.maxGroups ?? null;
			return {
				count: groups.length,
				max,
				canAdd: editable && (max === null || groups.length < max),
			};
		},
		/** Undoes a change's step, when nothing has changed since. */
		undo: (step: number) => {
			if (brickStore.get.editRevision === step) brickStore.edits.undo();
		},
	};
};

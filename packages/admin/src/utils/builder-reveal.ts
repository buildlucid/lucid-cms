import type { Collection, InternalDocumentField } from "@types";
import { resolvePreviewFieldTarget } from "@/hooks/usePreviewFocus/utils/resolve-preview-field-target";
import type { BrickData } from "@/store/brickStore/brickStore";
import {
	getPreviewStructureId,
	highlightPreviewFields,
	revealPreviewField,
} from "@/utils/preview-focus-dom";
import safeDeepEqual from "@/utils/safe-deep-equal";

//* lazy builder content can take a moment to render once its brick opens
const revealWaitMs = 3_000;

/** A field's keys and repeater item positions from its brick down, which an empty path leaves at the brick itself. */
export type BuilderFieldPath = Array<string | number>;

/** A field, or a brick's header, in the bricks as the builder has them. */
export type BuilderFieldTarget = {
	brickIndex: number;
	path: BuilderFieldPath;
};

type BuilderTargetContext = {
	collection: Collection;
	collectionKey: string;
	documentId: number | undefined;
	bricks: BrickData[];
};

/** Finds the path to a field at brick level or inside the repeater group it belongs to. */
export const getBuilderFieldPath = (
	fields: InternalDocumentField[],
	key: string,
	groupRef?: string,
): BuilderFieldPath | undefined => {
	if (groupRef === undefined) {
		return fields.some((field) => field.key === key) ? [key] : undefined;
	}

	for (const field of fields) {
		for (const [index, group] of (field.groups ?? []).entries()) {
			const nested =
				group.ref === groupRef
					? getBuilderFieldPath(group.fields, key)
					: getBuilderFieldPath(group.fields, key, groupRef);
			if (nested) return [field.key, index, ...nested];
		}
	}
	return undefined;
};

/** Lists changed field paths, targeting nested repeater fields for content edits and the repeater itself for item additions, removals or reordering. */
export const getChangedFieldPaths = (
	current: InternalDocumentField[],
	previous: InternalDocumentField[],
	prefix: BuilderFieldPath = [],
): BuilderFieldPath[] => {
	const previousByKey = new Map(previous.map((field) => [field.key, field]));

	return current.flatMap((field) => {
		const before = previousByKey.get(field.key);
		if (safeDeepEqual(field, before)) return [];

		const path = [...prefix, field.key];
		const groups = field.groups;
		const previousGroups = before?.groups;
		const sameItems =
			groups !== undefined &&
			previousGroups !== undefined &&
			groups.length === previousGroups.length &&
			groups.every((group, index) => previousGroups[index]?.ref === group.ref);
		if (!sameItems) return [path];

		//* items that only opened or closed add no paths
		return groups.flatMap((group, index) =>
			getChangedFieldPaths(group.fields, previousGroups[index]?.fields ?? [], [
				...path,
				index,
			]),
		);
	});
};

/** Resolves the field or brick header and the structures to open, returning null when it cannot be shown. */
const resolveBuilderTarget = (
	context: BuilderTargetContext,
	target: BuilderFieldTarget,
) => {
	const brick = context.bricks[target.brickIndex];
	if (!brick) return null;

	//* a brick on its own shows its header, as it has no field of its own
	if (target.path.length === 0) {
		return brick.type === "collection-fields"
			? null
			: {
					fieldId: getPreviewStructureId({
						brickIndex: target.brickIndex,
						type: "brick",
					}),
					structureIds: [],
				};
	}

	return resolvePreviewFieldTarget({
		target: {
			collectionKey: context.collectionKey,
			//* only the brick and path find the field
			documentId: context.documentId ?? 0,
			brick:
				brick.type === "collection-fields"
					? undefined
					: {
							type: brick.type === "fixed" ? "fixed" : "builder",
							key: brick.key,
							order: brick.order,
						},
			path: target.path,
		},
		collection: context.collection,
		bricks: context.bricks,
	});
};

/** Opens and scrolls to a field or brick header, returning whether it was shown. */
export const revealBuilderField = async (
	props: BuilderTargetContext & BuilderFieldTarget,
) => {
	const resolution = resolveBuilderTarget(props, props);
	if (!resolution) return false;

	const shown = await revealPreviewField({
		fieldId: resolution.fieldId,
		structureIds: resolution.structureIds,
		signal: AbortSignal.timeout(revealWaitMs),
	});
	return shown !== null;
};

/** Highlights rendered targets, scrolling only when none are in view and opening the first target when none are rendered. */
export const highlightBuilderFields = (
	context: BuilderTargetContext,
	targets: BuilderFieldTarget[],
) => {
	const fieldIds = targets.flatMap((target) => {
		const resolution = resolveBuilderTarget(context, target);
		return resolution ? [resolution.fieldId] : [];
	});
	if (highlightPreviewFields(fieldIds) > 0) return;

	const [first] = targets;
	if (first) void revealBuilderField({ ...context, ...first });
};

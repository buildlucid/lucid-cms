import type { Collection, ResolvedAdminCopy } from "@types";
import {
	getPreviewTargetKind,
	type PreviewFieldTarget,
	type PreviewRepeater,
	previewProtocolLimits,
} from "@/preview/protocol";
import type { CollectionFieldConfig } from "@/types/collection-config";
import helpers from "@/utils/helpers";
import resolveFieldAccess from "@/utils/resolve-field-access";

/** A field's name by its brick's key (none for the document's own fields) and content path, with "*" for repeater items. */
export type PreviewFieldName = {
	brick?: string;
	path: string[];
	label: string;
	/** Whether the field is a repeater, which items can be added to. */
	repeater?: boolean;
};

/** A builder brick the preview's controls can name, and add when allowed. */
export type PreviewBrickOption = {
	key: string;
	label: string;
	description?: string;
	addable: boolean;
};

/** The names a preview in edit mode shows, and which bricks can be added from it. */
export type PreviewEditingDetails = {
	/** The collection's builder bricks, in the order the builder lists them. */
	bricks: PreviewBrickOption[];
	fields: PreviewFieldName[];
};

const labelOf = (config: {
	key: string;
	details?: { label?: ResolvedAdminCopy };
}) =>
	helpers.getLocaleValue({
		value: config.details?.label,
		fallback: config.key,
	}) || config.key;

/** Field names by content path: nested sections and collapsibles add their key, tabs and inline ones don't, and repeater items are "*". */
const fieldNames = (
	configs: CollectionFieldConfig[],
	brick: string | undefined,
	prefix: string[],
): PreviewFieldName[] =>
	configs.flatMap((config): PreviewFieldName[] => {
		if (config.type === "tab") return fieldNames(config.fields, brick, prefix);
		const owner = brick === undefined ? {} : { brick };
		const path = [...prefix, config.key];
		if (config.type === "section" || config.type === "collapsible") {
			if (config.output !== "nested") {
				return fieldNames(config.fields, brick, prefix);
			}
			return [
				{ ...owner, path, label: labelOf(config) },
				...fieldNames(config.fields, brick, path),
			];
		}
		if (config.type === "repeater") {
			return [
				{ ...owner, path, label: labelOf(config), repeater: true },
				...fieldNames(config.fields, brick, [...path, "*"]),
			];
		}
		return [{ ...owner, path, label: labelOf(config) }];
	});

/** The brick and field names a preview in edit mode shows, and which bricks can be added from it. */
export const getPreviewEditingDetails = (
	collection: Collection,
): PreviewEditingDetails => ({
	bricks: collection.builderBricks.map((brick) => {
		const description = helpers.getLocaleValue({
			value: brick.details.description,
		});
		return {
			key: brick.key,
			label: labelOf(brick),
			...(description ? { description } : {}),
			addable: resolveFieldAccess(brick.permissions) === "editable",
		};
	}),
	fields: [
		...fieldNames(collection.fields, undefined, []),
		...[...collection.fixedBricks, ...collection.builderBricks].flatMap(
			(brick) => fieldNames(brick.fields, brick.key, []),
		),
	],
});

/** The repeaters the page outlines as lists in edit mode. */
export const getPreviewRepeaters = (
	details: PreviewEditingDetails,
): PreviewRepeater[] =>
	details.fields
		.filter((field) => field.repeater)
		.slice(0, previewProtocolLimits.repeaters)
		.map(({ brick, path }) =>
			brick === undefined ? { path } : { brick, path },
		);

/** Whether a field name's path, with "*" for items, matches a target's content path. */
const matchesPath = (pattern: string[], path: Array<string | number>) =>
	pattern.length === path.length &&
	pattern.every((segment, index) =>
		segment === "*" ? typeof path[index] === "number" : segment === path[index],
	);

/** The name of a brick, repeater item or field on the page, eg. "Hero" or "Links 2". */
export const getPreviewTargetName = (
	details: PreviewEditingDetails,
	target: PreviewFieldTarget,
): string => {
	const brickKey = target.brick?.key;
	if (getPreviewTargetKind(target) === "brick") {
		return (
			details.bricks.find((brick) => brick.key === brickKey)?.label ??
			brickKey ??
			""
		);
	}
	const nameAt = (path: Array<string | number>) =>
		details.fields.find(
			(field) => field.brick === brickKey && matchesPath(field.path, path),
		)?.label;
	const index = target.path.at(-1);
	if (typeof index === "number") {
		const repeater = nameAt(target.path.slice(0, -1));
		return `${repeater ?? target.path.at(-2) ?? ""} ${index + 1}`;
	}
	return nameAt(target.path) ?? String(target.path.at(-1) ?? "");
};

import type { BrickError, Collection, FieldError } from "@types";
import {
	type PreviewFieldPath,
	previewProtocolLimits,
} from "@/preview/protocol";
import type { BrickData } from "@/store/brickStore/brickStore";
import type { CollectionFieldConfig } from "@/types/collection-config";

type Path = Array<string | number>;

/** Finds a data field by key, with its content path: nested sections and collapsibles add their key, tabs and inline ones don't. */
const findField = (
	configs: CollectionFieldConfig[],
	key: string,
	prefix: string[] = [],
): { config: CollectionFieldConfig; path: string[] } | null => {
	for (const config of configs) {
		if (
			config.type === "tab" ||
			config.type === "section" ||
			config.type === "collapsible"
		) {
			const nested = findField(
				config.fields,
				key,
				config.type !== "tab" && config.output === "nested"
					? [...prefix, config.key]
					: prefix,
			);
			if (nested) return nested;
			continue;
		}
		if (config.key === key) return { config, path: [...prefix, key] };
	}
	return null;
};

/** The content paths of fields with errors in the shown locale, within a brick or repeater item, with items by their index. */
const errorPaths = (props: {
	configs: CollectionFieldConfig[];
	fields: BrickData["fields"];
	errors: FieldError[];
	prefix: Path;
	locale: string | undefined;
}): Path[] =>
	props.errors.flatMap((error): Path[] => {
		const found = findField(props.configs, error.key);
		if (!found) return [];
		const path = [...props.prefix, ...found.path];
		if (found.config.type !== "repeater" || !error.groupErrors?.length) {
			const shown =
				error.localeCode === null ||
				props.locale === undefined ||
				error.localeCode === props.locale;
			return shown ? [path] : [];
		}
		const { fields } = found.config;
		const groups = [
			...(props.fields.find((field) => field.key === error.key)?.groups ?? []),
		].sort((a, b) => a.order - b.order);
		return error.groupErrors.flatMap((groupError) => {
			const index = groups.findIndex((group) => group.ref === groupError.ref);
			const group = groups[index];
			return group
				? errorPaths({
						configs: fields,
						fields: group.fields,
						errors: groupError.fields,
						prefix: [...path, index],
						locale: props.locale,
					})
				: [];
		});
	});

/** The fields with validation errors, by brick and content path, which the preview outlines in red. */
export const getPreviewErrors = (props: {
	collection: Collection;
	bricks: BrickData[];
	brickErrors: BrickError[];
	fieldsErrors: FieldError[];
	locale: string | undefined;
}): PreviewFieldPath[] =>
	[
		...errorPaths({
			configs: props.collection.fields,
			fields:
				props.bricks.find((brick) => brick.type === "collection-fields")
					?.fields ?? [],
			errors: props.fieldsErrors,
			prefix: [],
			locale: props.locale,
		}).map((path) => ({ path })),
		...props.brickErrors.flatMap((brickError) => {
			const brick = props.bricks.find(
				(item) => item.ref === brickError.ref && item.key === brickError.key,
			);
			if (brick?.type !== "builder" && brick?.type !== "fixed") return [];
			const config = (
				brick.type === "fixed"
					? props.collection.fixedBricks
					: props.collection.builderBricks
			).find((item) => item.key === brick.key);
			if (!config) return [];
			const owner = { type: brick.type, key: brick.key, ref: brick.ref };
			return errorPaths({
				configs: config.fields,
				fields: brick.fields,
				errors: brickError.fields,
				prefix: [],
				locale: props.locale,
			}).map((path) => ({ brick: owner, path }));
		}),
	].slice(0, previewProtocolLimits.errors);

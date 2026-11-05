import type { BrickError, Collection, FieldError } from "@types";
import {
	type PreviewTargetPath,
	previewProtocolLimits,
} from "@/preview/protocol";
import type { BrickData } from "@/store/brickStore/brickStore";
import type { CollectionFieldConfig } from "@/types/collection-config";

type Path = PreviewTargetPath["path"];

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

/** The content paths of fields with errors in the shown locale, within a brick or repeater item. */
const errorPaths = (props: {
	configs: CollectionFieldConfig[];
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
		return error.groupErrors.flatMap((groupError) =>
			errorPaths({
				configs: fields,
				errors: groupError.fields,
				prefix: [...path, { ref: groupError.ref }],
				locale: props.locale,
			}),
		);
	});

/** The fields with validation errors, by brick and content path, which the preview outlines in red. */
export const getPreviewErrors = (props: {
	collection: Collection;
	bricks: BrickData[];
	brickErrors: BrickError[];
	fieldsErrors: FieldError[];
	locale: string | undefined;
}): PreviewTargetPath[] =>
	[
		...errorPaths({
			configs: props.collection.fields,
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
				errors: brickError.fields,
				prefix: [],
				locale: props.locale,
			}).map((path) => ({ brick: owner, path }));
		}),
	].slice(0, previewProtocolLimits.errors);

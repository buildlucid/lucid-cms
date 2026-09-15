import type { PreviewFieldTarget } from "@lucidcms/preview-protocol";
import type { Collection } from "@types";
import type { BrickData } from "@/store/brickStore/brickStore";
import type {
	CollectionDataFieldConfig,
	CollectionFieldConfig,
} from "@/types/collection-config";
import {
	getPreviewFieldId,
	getPreviewStructureId,
} from "@/utils/preview-focus-dom";

type PreviewFocusStructuralTarget = {
	type: "tab" | "collapsible";
	key: string;
	pathPrefix: Array<string | number>;
};

type ResolvedPreviewField = {
	structureIds: string[];
	fieldId: string;
};

type ConfigMatch = {
	config: CollectionDataFieldConfig;
	structures: PreviewFocusStructuralTarget[];
};

/** Finds a data field and records transparent UI structures around it. */
const findDataFieldConfig = (props: {
	configs: CollectionFieldConfig[];
	key: string;
	pathPrefix: Array<string | number>;
	structures: PreviewFocusStructuralTarget[];
}): ConfigMatch | null => {
	for (const config of props.configs) {
		if (
			config.type === "tab" ||
			config.type === "section" ||
			config.type === "collapsible"
		) {
			const nextStructures = [...props.structures];
			if (config.type === "tab" || config.type === "collapsible") {
				nextStructures.push({
					type: config.type,
					key: config.key,
					pathPrefix: props.pathPrefix,
				});
			}
			const nested = findDataFieldConfig({
				...props,
				configs: config.fields,
				structures: nextStructures,
			});
			if (nested) return nested;
			continue;
		}

		if (config.key === props.key) {
			return {
				config,
				structures: props.structures,
			};
		}
	}

	return null;
};

/** Resolves a public preview path into builder DOM targets. */
export const resolvePreviewFieldTarget = (props: {
	target: PreviewFieldTarget;
	collection: Collection;
	bricks: Array<Pick<BrickData, "key" | "order" | "type">>;
}): ResolvedPreviewField | null => {
	const targetBrick = props.target.brick;
	const brickIndex = targetBrick
		? props.bricks.findIndex(
				(brick) =>
					brick.type === targetBrick.type &&
					brick.key === targetBrick.key &&
					brick.order === targetBrick.order,
			)
		: props.bricks.findIndex((brick) => brick.type === "collection-fields");
	const brick = props.bricks[brickIndex];
	if (!brick) return null;

	const brickConfig =
		brick.type === "fixed"
			? props.collection.fixedBricks.find((config) => config.key === brick.key)
			: brick.type === "builder"
				? props.collection.builderBricks.find(
						(config) => config.key === brick.key,
					)
				: null;
	let configs: CollectionFieldConfig[] =
		brick.type === "collection-fields"
			? props.collection.fields
			: (brickConfig?.fields ?? []);
	let pathOffset = 0;
	let pathPrefix: Array<string | number> = [];
	const structureIds =
		targetBrick?.type === "builder"
			? [getPreviewStructureId({ brickIndex, type: "brick" })]
			: [];

	while (pathOffset < props.target.path.length) {
		const key = props.target.path[pathOffset];
		if (typeof key !== "string") return null;

		const match = findDataFieldConfig({
			configs,
			key,
			pathPrefix,
			structures: [],
		});
		if (!match) return null;
		structureIds.push(
			...match.structures.map((structure) =>
				getPreviewStructureId({ brickIndex, ...structure }),
			),
		);

		if (pathOffset === props.target.path.length - 1) {
			return {
				structureIds,
				fieldId: getPreviewFieldId({
					brickIndex,
					path: props.target.path,
				}),
			};
		}

		const groupIndex = props.target.path[pathOffset + 1];
		if (match.config.type !== "repeater" || typeof groupIndex !== "number") {
			return null;
		}

		const groupPath = [...pathPrefix, key, groupIndex];
		structureIds.push(
			getPreviewStructureId({
				brickIndex,
				type: "group",
				path: groupPath,
			}),
		);
		configs = match.config.fields;
		pathPrefix = groupPath;
		pathOffset += 2;
	}

	return null;
};

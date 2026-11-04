import type { Collection } from "@types";
import type { PreviewFieldTarget } from "@/preview/protocol";
import type { BrickData } from "@/store/brickStore/brickStore";
import type {
	CollectionDataFieldConfig,
	CollectionFieldConfig,
} from "@/types/collection-config";

type ContentPath = Array<string | number>;

/** Finds a data field's config, with the keys of the containers that nest it in content responses. */
const findField = (
	configs: CollectionFieldConfig[],
	key: string,
): { config: CollectionDataFieldConfig; containers: string[] } | null => {
	for (const config of configs) {
		if (
			config.type === "tab" ||
			config.type === "section" ||
			config.type === "collapsible"
		) {
			const nested = findField(config.fields, key);
			if (!nested) continue;
			//* tabs and inline containers leave their fields where they are
			return config.type !== "tab" && config.output === "nested"
				? { ...nested, containers: [config.key, ...nested.containers] }
				: nested;
		}
		if (config.key === key) return { config, containers: [] };
	}
	return null;
};

/** Turns a stored field path, of field keys and repeater item indexes, into the path content responses use. */
const toContentPath = (
	configs: CollectionFieldConfig[],
	path: ContentPath,
): ContentPath | null => {
	const [key, index, ...rest] = path;
	if (typeof key !== "string") return null;
	const match = findField(configs, key);
	if (!match) return null;

	const fieldPath = [...match.containers, key];
	if (index === undefined) return fieldPath;
	if (typeof index !== "number" || match.config.type !== "repeater") {
		return null;
	}
	if (rest.length === 0) return [...fieldPath, index];
	const nested = toContentPath(match.config.fields, rest);
	return nested ? [...fieldPath, index, ...nested] : null;
};

/** Where a builder field, or a brick with an empty path, is in the previewed page. Null for embedded bricks and unknown fields. */
export const getBuilderPreviewTarget = (props: {
	collectionKey: string;
	documentId: number;
	collection: Collection;
	brick: Pick<BrickData, "key" | "ref" | "type">;
	path: ContentPath;
}): PreviewFieldTarget | null => {
	const { brick } = props;
	const document = {
		collectionKey: props.collectionKey,
		documentId: props.documentId,
	};

	if (brick.type === "collection-fields") {
		const path = toContentPath(props.collection.fields, props.path);
		return path ? { ...document, path } : null;
	}
	if (brick.type === "embedded") return null;

	const configs = (
		brick.type === "fixed"
			? props.collection.fixedBricks
			: props.collection.builderBricks
	).find((config) => config.key === brick.key)?.fields;
	if (!configs) return null;
	const target = {
		...document,
		brick: { type: brick.type, key: brick.key, ref: brick.ref },
	};
	if (props.path.length === 0) return { ...target, path: [] };

	const path = toContentPath(configs, props.path);
	return path ? { ...target, path } : null;
};

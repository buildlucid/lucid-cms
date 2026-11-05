import type { Collection, InternalDocumentField } from "@types";
import type { PreviewTarget } from "@/preview/protocol";
import type { BrickData } from "@/store/brickStore/brickStore";
import type {
	CollectionDataFieldConfig,
	CollectionFieldConfig,
} from "@/types/collection-config";

/** A field's keys and repeater item positions, as the builder has them. */
type BuilderPath = Array<string | number>;

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

/** Turns a builder field path into the path content responses use, with section keys and items by ref. */
const toContentPath = (
	configs: CollectionFieldConfig[],
	fields: InternalDocumentField[],
	path: BuilderPath,
): PreviewTarget["path"] | null => {
	const [key, position, ...rest] = path;
	if (typeof key !== "string") return null;
	const match = findField(configs, key);
	if (!match) return null;

	const fieldPath = [...match.containers, key];
	if (position === undefined) return fieldPath;
	if (typeof position !== "number" || match.config.type !== "repeater") {
		return null;
	}
	const group = fields.find((field) => field.key === key)?.groups?.[position];
	if (!group) return null;
	const item = { ref: group.ref };
	if (rest.length === 0) return [...fieldPath, item];
	const nested = toContentPath(match.config.fields, group.fields, rest);
	return nested ? [...fieldPath, item, ...nested] : null;
};

/** Where a builder field, or a brick with an empty path, is in the previewed page. Null for embedded bricks and unknown fields. */
export const getBuilderPreviewTarget = (props: {
	collectionKey: string;
	documentId: number;
	collection: Collection;
	brick: Pick<BrickData, "key" | "ref" | "type" | "fields">;
	path: BuilderPath;
}): PreviewTarget | null => {
	const { brick } = props;
	const document = {
		collectionKey: props.collectionKey,
		documentId: props.documentId,
	};

	if (brick.type === "collection-fields") {
		const path = toContentPath(
			props.collection.fields,
			brick.fields,
			props.path,
		);
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

	const path = toContentPath(configs, brick.fields, props.path);
	return path ? { ...target, path } : null;
};

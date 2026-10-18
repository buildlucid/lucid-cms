import type { FieldTypes, ResolvedLucidConfig } from "@lucidcms/core/types";

/** Field types keyed by names unique across a collection or brick, including repeater fields. */
export type FieldTypeMap = ReadonlyMap<string, FieldTypes>;

const empty: FieldTypeMap = new Map();

/** Looks up the field types of a collection's own fields, or of one of its bricks, building each map once. */
const createFieldTypes = (config: ResolvedLucidConfig) => {
	const maps = new Map<string, FieldTypeMap>();

	return (collectionKey: string, brickKey?: string): FieldTypeMap => {
		const id =
			brickKey === undefined ? collectionKey : `${collectionKey}:${brickKey}`;
		const existing = maps.get(id);
		if (existing) return existing;

		const collection = config.collections.find(
			(item) => item.key === collectionKey,
		);
		const builder =
			brickKey === undefined
				? collection
				: collection?.brickInstances.find((brick) => brick.key === brickKey);
		const map: FieldTypeMap = builder
			? new Map(builder.flatFields.map((field) => [field.key, field.type]))
			: empty;
		maps.set(id, map);
		return map;
	};
};

export type FieldTypesLookup = ReturnType<typeof createFieldTypes>;

export default createFieldTypes;

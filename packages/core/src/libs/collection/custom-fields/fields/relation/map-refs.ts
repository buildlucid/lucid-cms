import isPlainObject from "../../../../../utils/helpers/is-plain-object.js";
import type { FieldRefMapper } from "../../types.js";
import type { RelationCustomFieldValue } from "./types.js";

/** Rewrites linked document IDs, leaving out documents `map` returns null for. */
const mapRelationRefs = (value: unknown, map: FieldRefMapper) => {
	if (!Array.isArray(value)) return value;

	return value.flatMap((item): RelationCustomFieldValue[] => {
		if (
			!isPlainObject(item) ||
			typeof item.id !== "number" ||
			typeof item.collectionKey !== "string"
		) {
			return [];
		}

		const id = map({
			resource: "documents",
			collectionKey: item.collectionKey,
			id: item.id,
		});
		return id === null ? [] : [{ id, collectionKey: item.collectionKey }];
	});
};

export default mapRelationRefs;

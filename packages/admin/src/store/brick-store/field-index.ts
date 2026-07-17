import type { InternalDocumentField } from "@types";

/**
 * Alternating field and group indexes that lead to a field in a nested
 * repeater tree. Root fields contain one index; every nested level adds a
 * group index followed by another field index.
 */
export type BrickFieldPath = number[];

export interface BrickFieldIndex {
	fieldPathsByScopeKey: Map<string, BrickFieldPath>;
}

const ROOT_SCOPE = "root";

const getScopedFieldKey = (key: string, groupRef?: string) =>
	`${groupRef ?? ROOT_SCOPE}\u0000${key}`;

/**
 * Indexes fields and repeater groups by their stable keys and refs. Building
 * the index is linear in the brick size and is only needed after structural
 * changes; ordinary input edits can then resolve their field in O(depth).
 */
export const createBrickFieldIndex = (
	fields: InternalDocumentField[],
): BrickFieldIndex => {
	const index: BrickFieldIndex = {
		fieldPathsByScopeKey: new Map(),
	};

	const visitFields = (
		currentFields: InternalDocumentField[],
		scopePath: BrickFieldPath,
		groupRef?: string,
	) => {
		currentFields.forEach((field, fieldIndex) => {
			const fieldPath = [...scopePath, fieldIndex];
			index.fieldPathsByScopeKey.set(
				getScopedFieldKey(field.key, groupRef),
				fieldPath,
			);

			field.groups?.forEach((group, groupIndex) => {
				const groupPath = [...fieldPath, groupIndex];
				visitFields(group.fields, groupPath, group.ref);
			});
		});
	};

	visitFields(fields, []);
	return index;
};

/** Returns the indexed path for a root field or a field inside one group. */
export const getIndexedFieldPath = (
	index: BrickFieldIndex,
	key: string,
	groupRef?: string,
): BrickFieldPath | undefined => {
	return index.fieldPathsByScopeKey.get(getScopedFieldKey(key, groupRef));
};

/** Resolves a field path against either the live Solid store or a draft. */
export const getFieldAtPath = (
	fields: InternalDocumentField[],
	path: BrickFieldPath,
): InternalDocumentField | undefined => {
	let currentFields = fields;

	for (let pathIndex = 0; pathIndex < path.length; pathIndex += 2) {
		const field = currentFields[path[pathIndex]];
		if (!field) return undefined;
		if (pathIndex === path.length - 1) return field;

		const group = field.groups?.[path[pathIndex + 1]];
		if (!group) return undefined;
		currentFields = group.fields;
	}

	return undefined;
};

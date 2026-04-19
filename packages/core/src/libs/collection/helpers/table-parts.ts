/**
 * Reserved parts used in Lucid collection table names.
 *
 * This stays in a tiny standalone module so other helpers and validation
 * schemas can reference these constants without pulling in the full
 * build-table-name dependency graph.
 */
export const collectionTableParts = {
	document: "document",
	fields: "fld",
	versions: "ver",
} as const;

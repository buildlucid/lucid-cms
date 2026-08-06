import type { OperationNode } from "kysely";

/** Reads an identifier without exposing Kysely's internal node interfaces. */
export const identifierName = (
	node: OperationNode | undefined,
): string | undefined =>
	node?.kind === "IdentifierNode"
		? (node as OperationNode & { name: string }).name
		: undefined;

/** Resolves the physical name from a table node, unwrapping an alias if needed. */
export const tableName = (
	node: OperationNode | undefined,
): string | undefined => {
	if (node?.kind === "AliasNode") {
		return tableName((node as OperationNode & { node: OperationNode }).node);
	}
	if (node?.kind !== "TableNode") return undefined;
	return (
		node as OperationNode & {
			table: { identifier: { name: string } };
		}
	).table.identifier.name;
};

/** Returns the visible source name used to qualify a table in SQL. */
export const sourceAlias = (node: OperationNode): string | undefined => {
	if (node.kind !== "AliasNode") return tableName(node);
	return identifierName(
		(node as OperationNode & { alias: OperationNode }).alias,
	);
};

/** Reads a column from either a column node or a qualified reference. */
export const columnName = (
	node: OperationNode | undefined,
): string | undefined => {
	if (node?.kind === "ColumnNode") {
		return (node as OperationNode & { column: { name: string } }).column.name;
	}
	if (node?.kind !== "ReferenceNode") return undefined;
	return columnName((node as OperationNode & { column: OperationNode }).column);
};

/** Returns the alias of a selection, falling back to its selected column. */
export const selectionName = (
	node: OperationNode | undefined,
): string | undefined => {
	if (node?.kind === "AliasNode") {
		return identifierName(
			(node as OperationNode & { alias: OperationNode }).alias,
		);
	}
	return columnName(node);
};

/** Reads the table qualifier from a reference node. */
export const referenceTable = (
	node: OperationNode | undefined,
): string | undefined => {
	if (node?.kind !== "ReferenceNode") return undefined;
	return tableName((node as OperationNode & { table?: OperationNode }).table);
};

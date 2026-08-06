import type { OperationNode, SelectQueryNode } from "kysely";
import type TableRegistry from "../../table/registry.js";
import {
	columnName,
	referenceTable,
	sourceAlias,
	tableName,
} from "../operation-node.js";
import { type CtePlans, createResultPlan } from "../result/plan.js";
import type { CodecTarget, InputSource, InputSourceMap } from "./types.js";

/** Maps every visible SELECT alias to a physical table or derived result plan. */
export const sourcesForSelect = (
	node: SelectQueryNode,
	registry: TableRegistry,
	ctePlans: CtePlans,
): InputSourceMap => {
	const sources: InputSourceMap = new Map();
	const add = (source: OperationNode) => {
		const table = tableName(source);
		const alias = sourceAlias(source);
		if (table && alias) {
			const ctePlan = ctePlans.get(table);
			sources.set(alias, ctePlan ? { plan: ctePlan } : { tableName: table });
			return;
		}
		if (source.kind !== "AliasNode" || !alias) return;
		const aliased = (source as OperationNode & { node: OperationNode }).node;
		if (aliased.kind === "SelectQueryNode") {
			sources.set(alias, {
				plan: createResultPlan(aliased as SelectQueryNode, registry, ctePlans),
			});
		}
	};

	for (const source of node.from?.froms ?? []) add(source);
	for (const join of node.joins ?? []) add(join.table);
	return sources;
};

const sourceContainsColumn = (
	source: InputSource,
	column: string,
	registry: TableRegistry,
) =>
	source.plan?.[column]?.codec !== undefined ||
	(source.tableName
		? registry.resolve(source.tableName)?.columns[column] !== undefined
		: false);

const uniqueSourceForColumn = (
	sources: InputSourceMap,
	column: string,
	registry: TableRegistry,
): InputSource | undefined => {
	let match: InputSource | undefined;
	for (const candidate of sources.values()) {
		if (!sourceContainsColumn(candidate, column, registry)) continue;
		if (match) return undefined;
		match = candidate;
	}
	return match;
};

/**
 * Resolves the codec for a reference. Unqualified columns are accepted only
 * when exactly one visible source declares them, preventing accidental casts.
 */
export const codecForReference = (
	reference: OperationNode,
	sources: InputSourceMap | undefined,
	writeTable: string | undefined,
	registry: TableRegistry,
): CodecTarget | undefined => {
	const column = columnName(reference);
	if (!column) return undefined;
	const qualifier = referenceTable(reference);
	let source = qualifier ? sources?.get(qualifier) : undefined;

	if (!source && !qualifier && sources) {
		source = uniqueSourceForColumn(sources, column, registry);
	}

	const plannedEntry = source?.plan?.[column];
	if (plannedEntry?.codec) {
		return {
			codec: plannedEntry.codec,
			columnType: plannedEntry.columnType,
		};
	}

	const table = source?.tableName ?? writeTable;
	const resolved = table ? registry.resolve(table)?.columns[column] : undefined;
	return resolved
		? { codec: resolved.codec, columnType: resolved.dataType }
		: undefined;
};

import type { OperationNode, RootOperationNode } from "kysely";
import { codecs } from "../../codecs/index.js";
import type TableRegistry from "../../table/registry.js";
import {
	columnName,
	identifierName,
	referenceTable,
	selectionName,
	tableName,
} from "../operation-node.js";
import { getTaggedResult } from "./tags.js";
import type {
	CtePlans,
	ResultPlan,
	ResultPlanEntry,
	TaggedResult,
} from "./types.js";

type Source = {
	tableName?: string;
	plan?: ResultPlan;
};

type SelectQueryLike = OperationNode & {
	kind: "SelectQueryNode";
	from?: { froms: readonly OperationNode[] };
	joins?: readonly { table: OperationNode }[];
	selections?: readonly { selection: OperationNode }[];
	setOperations?: readonly { expression: OperationNode }[];
	with?: {
		expressions: readonly {
			name: { table: OperationNode; columns?: readonly OperationNode[] };
			expression: OperationNode;
		}[];
	};
};

const addSource = (
	sources: Map<string, Source>,
	node: OperationNode,
	registry: TableRegistry,
	ctePlans: CtePlans,
) => {
	if (node.kind === "TableNode") {
		const name = tableName(node);
		if (name) {
			const ctePlan = ctePlans.get(name);
			sources.set(name, ctePlan ? { plan: ctePlan } : { tableName: name });
		}
		return;
	}

	if (node.kind !== "AliasNode") return;
	const aliasNode = node as OperationNode & {
		node: OperationNode;
		alias: OperationNode;
	};
	const alias = identifierName(aliasNode.alias);
	if (!alias) return;

	const name = tableName(aliasNode.node);
	if (name) {
		const ctePlan = ctePlans.get(name);
		sources.set(alias, ctePlan ? { plan: ctePlan } : { tableName: name });
		return;
	}

	if (aliasNode.node.kind === "SelectQueryNode") {
		sources.set(alias, {
			plan: createSelectResultPlan(
				aliasNode.node as SelectQueryLike,
				registry,
				ctePlans,
			),
		});
	}
};

const getSources = (
	node: SelectQueryLike,
	registry: TableRegistry,
	ctePlans: CtePlans,
): Map<string, Source> => {
	const sources = new Map<string, Source>();
	for (const from of node.from?.froms ?? [])
		addSource(sources, from, registry, ctePlans);
	for (const join of node.joins ?? [])
		addSource(sources, join.table, registry, ctePlans);
	return sources;
};

const resolveSource = (
	sources: Map<string, Source>,
	reference: OperationNode,
	column: string,
	registry: TableRegistry,
): Source | undefined => {
	const qualifier = referenceTable(reference);
	if (qualifier) return sources.get(qualifier);

	let match: Source | undefined;
	for (const source of sources.values()) {
		const containsColumn =
			source.plan?.[column] !== undefined ||
			(source.tableName
				? registry.resolve(source.tableName)?.columns[column] !== undefined
				: false);
		if (!containsColumn) continue;
		if (match) return undefined;
		match = source;
	}
	return match;
};

const entryForReference = (
	reference: OperationNode,
	sources: Map<string, Source>,
	registry: TableRegistry,
): ResultPlanEntry | undefined => {
	const column = columnName(reference);
	if (!column) return undefined;
	const source = resolveSource(sources, reference, column, registry);
	if (source?.plan?.[column]) return source.plan[column];
	if (!source?.tableName) return undefined;

	const resolvedColumn = registry.resolve(source.tableName)?.columns[column];
	if (!resolvedColumn?.codec.decodes && !resolvedColumn?.codec.encodes) {
		return undefined;
	}
	return {
		codec: resolvedColumn.codec,
		columnType: resolvedColumn.dataType,
	};
};

const planForTag = (
	tag: TaggedResult,
	registry: TableRegistry,
	ctePlans: CtePlans,
): ResultPlanEntry => {
	if (tag.kind === "codec") return { codec: tag.codec };
	return {
		codec: codecs.json,
		container: "array",
		nested:
			tag.source.kind === "SelectQueryNode"
				? createSelectResultPlan(
						tag.source as SelectQueryLike,
						registry,
						ctePlans,
					)
				: {},
	};
};

const mergeAllColumns = (
	plan: Record<string, ResultPlanEntry>,
	source: Source,
	registry: TableRegistry,
) => {
	if (source.plan) {
		Object.assign(plan, source.plan);
		return;
	}
	if (!source.tableName) return;

	for (const [name, column] of Object.entries(
		registry.resolve(source.tableName)?.columns ?? {},
	)) {
		if (column.codec.decodes || column.codec.encodes) {
			plan[name] = {
				codec: column.codec,
				columnType: column.dataType,
			};
		}
	}
};

/** Adds one selected output path when its source or expression has a codec. */
const addSelection = (
	plan: Record<string, ResultPlanEntry>,
	selection: OperationNode,
	sources: Map<string, Source>,
	registry: TableRegistry,
	ctePlans: CtePlans,
) => {
	const directTag = getTaggedResult(selection);

	if (selection.kind === "AliasNode") {
		const aliasNode = selection as OperationNode & {
			node: OperationNode;
			alias: OperationNode;
		};
		const alias = identifierName(aliasNode.alias);
		if (!alias) return;
		const tag = directTag ?? getTaggedResult(aliasNode.node);
		if (tag) {
			plan[alias] = planForTag(tag, registry, ctePlans);
			return;
		}
		const entry = entryForReference(aliasNode.node, sources, registry);
		if (entry) plan[alias] = entry;
		return;
	}

	if (directTag) return;

	if (selection.kind === "SelectAllNode") {
		for (const source of sources.values())
			mergeAllColumns(plan, source, registry);
		return;
	}

	if (selection.kind === "ReferenceNode") {
		const reference = selection as OperationNode & { column: OperationNode };
		if (reference.column.kind === "SelectAllNode") {
			const qualifier = referenceTable(selection);
			const source = qualifier ? sources.get(qualifier) : undefined;
			if (source) mergeAllColumns(plan, source, registry);
			return;
		}

		const name = columnName(selection);
		const entry = entryForReference(selection, sources, registry);
		if (name && entry) plan[name] = entry;
	}
};

/** Intersects one output field so set-operation branches cannot disagree. */
const intersectEntries = (
	left: ResultPlanEntry,
	right: ResultPlanEntry,
): ResultPlanEntry | undefined => {
	if (left.codec !== right.codec) return undefined;

	const entry: ResultPlanEntry = {};
	if (left.codec) entry.codec = left.codec;
	if (left.columnType === right.columnType && left.columnType) {
		entry.columnType = left.columnType;
	}
	if (left.container === right.container && left.container) {
		entry.container = left.container;
	}
	if (left.nested && right.nested) {
		entry.nested = intersectPlans(left.nested, right.nested);
	}

	return entry.codec || entry.nested ? entry : undefined;
};

/** Keeps only decoders that are valid for every branch of a set operation. */
const intersectPlans = (left: ResultPlan, right: ResultPlan): ResultPlan => {
	const plan: Record<string, ResultPlanEntry> = {};
	for (const [key, leftEntry] of Object.entries(left)) {
		const rightEntry = right[key];
		if (!rightEntry) continue;
		const entry = intersectEntries(leftEntry, rightEntry);
		if (entry) plan[key] = entry;
	}
	return plan;
};

/** Builds output plans for CTEs visible to the current select query. */
export const createCteResultPlans = (
	node: SelectQueryLike,
	registry: TableRegistry,
	inherited: CtePlans,
): CtePlans => {
	if (!node.with?.expressions.length) return inherited;
	const plans = new Map(inherited);

	for (const expression of node.with.expressions) {
		const name = tableName(expression.name.table);
		if (!name) continue;
		if (expression.expression.kind !== "SelectQueryNode") {
			plans.set(name, {});
			continue;
		}

		const select = expression.expression as SelectQueryLike;
		const sourcePlan = createSelectResultPlan(select, registry, plans);
		const cteColumns = expression.name.columns;
		if (!cteColumns?.length) {
			plans.set(name, sourcePlan);
			continue;
		}

		const remapped: Record<string, ResultPlanEntry> = {};
		for (const [index, cteColumn] of cteColumns.entries()) {
			const targetName = columnName(cteColumn);
			const sourceName = selectionName(select.selections?.[index]?.selection);
			if (targetName && sourceName && sourcePlan[sourceName]) {
				remapped[targetName] = sourcePlan[sourceName];
			}
		}
		plans.set(name, remapped);
	}

	return plans;
};

/** Plans selected output paths, including CTEs, joins and set operations. */
const createSelectResultPlan = (
	node: SelectQueryLike,
	registry: TableRegistry,
	inheritedCtePlans: CtePlans = new Map(),
): ResultPlan => {
	const ctePlans = createCteResultPlans(node, registry, inheritedCtePlans);
	const sources = getSources(node, registry, ctePlans);
	let plan: ResultPlan = {};
	for (const selection of node.selections ?? []) {
		addSelection(
			plan as Record<string, ResultPlanEntry>,
			selection.selection,
			sources,
			registry,
			ctePlans,
		);
	}

	for (const setOperation of node.setOperations ?? []) {
		const branchPlan =
			setOperation.expression.kind === "SelectQueryNode"
				? createSelectResultPlan(
						setOperation.expression as SelectQueryLike,
						registry,
						ctePlans,
					)
				: {};
		plan = intersectPlans(plan, branchPlan);
	}
	return plan;
};

/** Maps a mutation's target table into the same source model used by selects. */
const getMutationSources = (
	node: RootOperationNode,
	registry: TableRegistry,
): Map<string, Source> => {
	const sources = new Map<string, Source>();
	if (node.kind === "InsertQueryNode") {
		const into = (node as RootOperationNode & { into?: OperationNode }).into;
		if (into) addSource(sources, into, registry, new Map());
	} else if (node.kind === "UpdateQueryNode") {
		const table = (node as RootOperationNode & { table?: OperationNode }).table;
		if (table) addSource(sources, table, registry, new Map());
	} else if (node.kind === "DeleteQueryNode") {
		const froms = (
			node as RootOperationNode & {
				from: { froms: readonly OperationNode[] };
			}
		).from.froms;
		for (const from of froms) addSource(sources, from, registry, new Map());
	} else if (node.kind === "MergeQueryNode") {
		const into = (node as RootOperationNode & { into: OperationNode }).into;
		addSource(sources, into, registry, new Map());
	}
	return sources;
};

/** Creates an exact output-field decoding plan from a Kysely operation tree. */
export const createResultPlan = (
	node: RootOperationNode,
	registry: TableRegistry,
	inheritedCtePlans: CtePlans = new Map(),
): ResultPlan => {
	if (node.kind === "SelectQueryNode") {
		return createSelectResultPlan(
			node as SelectQueryLike,
			registry,
			inheritedCtePlans,
		);
	}

	if (
		node.kind !== "InsertQueryNode" &&
		node.kind !== "UpdateQueryNode" &&
		node.kind !== "DeleteQueryNode" &&
		node.kind !== "MergeQueryNode"
	) {
		return {};
	}

	const returning = (
		node as RootOperationNode & {
			returning?: { selections: readonly { selection: OperationNode }[] };
		}
	).returning;
	if (!returning) return {};

	const sources = getMutationSources(node, registry);
	const plan: Record<string, ResultPlanEntry> = {};
	for (const selection of returning.selections) {
		addSelection(plan, selection.selection, sources, registry, new Map());
	}
	return plan;
};

export { decodeResultRow } from "./decode.js";
export { tagResultNode, transferResultTag } from "./tags.js";
export type {
	CtePlans,
	ResultPlan,
	ResultPlanEntry,
	TaggedResult,
} from "./types.js";

import {
	type BinaryOperationNode,
	type ColumnUpdateNode,
	type DeleteQueryNode,
	type InsertQueryNode,
	type MergeQueryNode,
	type OperationNode,
	OperationNodeTransformer,
	type QueryId,
	type SelectQueryNode,
	type UpdateQueryNode,
} from "kysely";
import type DatabaseAdapter from "../../../adapter-base.js";
import type TableRegistry from "../../table/registry.js";
import { columnName, sourceAlias, tableName } from "../operation-node.js";
import {
	type CtePlans,
	createCteResultPlans,
	transferResultTag,
} from "../result/plan.js";
import { codecForReference, sourcesForSelect } from "./sources.js";
import type { InputSourceMap } from "./types.js";
import { encodeInsertValues, encodeValue } from "./value-encoder.js";

/** Applies column codecs to bound values while preserving every SQL expression. */
export default class InputCodecTransformer extends OperationNodeTransformer {
	readonly #adapter: DatabaseAdapter;
	readonly #registry: TableRegistry;
	readonly #cteStack: CtePlans[] = [];
	readonly #sourceStack: InputSourceMap[] = [];
	readonly #transformedRoots = new WeakSet<OperationNode>();
	readonly #writeTableStack: string[] = [];

	constructor(adapter: DatabaseAdapter, registry: TableRegistry) {
		super();
		this.#adapter = adapter;
		this.#registry = registry;
	}

	override transformNode<T extends OperationNode | undefined>(
		node: T,
		queryId?: QueryId,
	): T {
		if (node && this.#transformedRoots.has(node)) return node;
		const transformed = super.transformNode(node, queryId);
		if (node && transformed) transferResultTag(node, transformed);
		return transformed;
	}

	/** Marks a transformed query tree so nested compilation cannot encode it twice. */
	markTransformedRoot(node: OperationNode) {
		this.#transformedRoots.add(node);
	}

	#withCtePlans<T>(plans: CtePlans, callback: () => T): T {
		this.#cteStack.push(plans);
		try {
			return callback();
		} finally {
			this.#cteStack.pop();
		}
	}

	#withSources<T>(sources: InputSourceMap, callback: () => T): T {
		this.#sourceStack.push(sources);
		try {
			return callback();
		} finally {
			this.#sourceStack.pop();
		}
	}

	#withWriteTable<T>(table: string | undefined, callback: () => T): T {
		if (table) this.#writeTableStack.push(table);
		try {
			return callback();
		} finally {
			if (table) this.#writeTableStack.pop();
		}
	}

	/** Tracks visible tables, derived sources and CTEs while visiting a select. */
	protected override transformSelectQuery(
		node: SelectQueryNode,
		queryId?: QueryId,
	): SelectQueryNode {
		const inheritedCtePlans = this.#cteStack.at(-1) ?? new Map();
		const ctePlans = createCteResultPlans(
			node,
			this.#registry,
			inheritedCtePlans,
		);
		return this.#withCtePlans(ctePlans, () =>
			this.#withSources(sourcesForSelect(node, this.#registry, ctePlans), () =>
				super.transformSelectQuery(node, queryId),
			),
		);
	}

	/** Encodes positional insert rows against the target table's columns. */
	protected override transformInsertQuery(
		node: InsertQueryNode,
		queryId?: QueryId,
	): InsertQueryNode {
		const table = tableName(node.into) ?? this.#writeTableStack.at(-1);
		const encoded = encodeInsertValues(
			node,
			table,
			this.#adapter,
			this.#registry,
		);
		const sources: InputSourceMap = new Map();
		if (table) sources.set(table, { tableName: table });
		return this.#withSources(sources, () =>
			this.#withWriteTable(table, () =>
				super.transformInsertQuery(encoded, queryId),
			),
		);
	}

	/** Tracks merge aliases and the target table for predicates and assignments. */
	protected override transformMergeQuery(
		node: MergeQueryNode,
		queryId?: QueryId,
	): MergeQueryNode {
		const table = tableName(node.into);
		const sources: InputSourceMap = new Map();
		const targetAlias = sourceAlias(node.into);
		if (table && targetAlias) sources.set(targetAlias, { tableName: table });
		if (node.using) {
			const usingTable = tableName(node.using.table);
			const usingAlias = sourceAlias(node.using.table);
			if (usingTable && usingAlias) {
				sources.set(usingAlias, { tableName: usingTable });
			}
		}

		return this.#withSources(sources, () =>
			this.#withWriteTable(table, () =>
				super.transformMergeQuery(node, queryId),
			),
		);
	}

	/** Tracks the update target while transforming assignments and predicates. */
	protected override transformUpdateQuery(
		node: UpdateQueryNode,
		queryId?: QueryId,
	): UpdateQueryNode {
		const table = tableName(node.table);
		const sources: InputSourceMap = new Map();
		const alias = node.table ? sourceAlias(node.table) : undefined;
		if (table && alias) sources.set(alias, { tableName: table });
		return this.#withSources(sources, () =>
			this.#withWriteTable(table, () =>
				super.transformUpdateQuery(node, queryId),
			),
		);
	}

	/** Makes delete sources available while transforming their predicates. */
	protected override transformDeleteQuery(
		node: DeleteQueryNode,
		queryId?: QueryId,
	): DeleteQueryNode {
		const sources: InputSourceMap = new Map();
		for (const source of node.from.froms) {
			const table = tableName(source);
			const alias = sourceAlias(source);
			if (table && alias) sources.set(alias, { tableName: table });
		}
		return this.#withSources(sources, () =>
			super.transformDeleteQuery(node, queryId),
		);
	}

	/** Encodes a direct update assignment when its target column is declared. */
	protected override transformColumnUpdate(
		node: ColumnUpdateNode,
		queryId?: QueryId,
	): ColumnUpdateNode {
		const transformed = super.transformColumnUpdate(node, queryId);
		const column = columnName(transformed.column);
		const table = this.#writeTableStack.at(-1);
		const resolvedColumn =
			table && column
				? this.#registry.resolve(table)?.columns[column]
				: undefined;
		return resolvedColumn
			? {
					...transformed,
					value: encodeValue(
						transformed.value,
						{
							codec: resolvedColumn.codec,
							columnType: resolvedColumn.dataType,
						},
						this.#adapter,
					),
				}
			: transformed;
	}

	/** Encodes the value side of a comparison with a declared column. */
	protected override transformBinaryOperation(
		node: BinaryOperationNode,
		queryId?: QueryId,
	): BinaryOperationNode {
		const transformed = super.transformBinaryOperation(node, queryId);
		const leftTarget = codecForReference(
			transformed.leftOperand,
			this.#sourceStack.at(-1),
			this.#writeTableStack.at(-1),
			this.#registry,
		);
		if (leftTarget) {
			return {
				...transformed,
				rightOperand: encodeValue(
					transformed.rightOperand,
					leftTarget,
					this.#adapter,
				),
			};
		}

		const rightTarget = codecForReference(
			transformed.rightOperand,
			this.#sourceStack.at(-1),
			this.#writeTableStack.at(-1),
			this.#registry,
		);
		return rightTarget
			? {
					...transformed,
					leftOperand: encodeValue(
						transformed.leftOperand,
						rightTarget,
						this.#adapter,
					),
				}
			: transformed;
	}
}

import type {
	InsertQueryNode,
	OperationNode,
	ValueListNode,
	ValueNode,
	ValuesNode,
} from "kysely";
import type DatabaseAdapter from "../../../adapter-base.js";
import type TableRegistry from "../../table/registry.js";
import { columnName } from "../operation-node.js";
import type { CodecTarget } from "./types.js";

/** Encodes a bound value node without changing surrounding SQL expressions. */
export const encodeValue = (
	node: OperationNode,
	target: CodecTarget,
	adapter: DatabaseAdapter,
): OperationNode => {
	const { codec } = target;
	if (!codec.encodes) return node;
	const context = { adapter, columnType: target.columnType };

	if (node.kind === "ValueNode") {
		const valueNode = node as ValueNode;
		return {
			...valueNode,
			value: codec.encode(valueNode.value, context),
		} as ValueNode;
	}

	if (node.kind === "PrimitiveValueListNode") {
		const values = (node as OperationNode & { values: readonly unknown[] })
			.values;
		return {
			...node,
			values: values.map((value) => codec.encode(value, context)),
		} as OperationNode;
	}

	if (node.kind === "ValueListNode") {
		const list = node as ValueListNode;
		return {
			...list,
			values: list.values.map((value) => encodeValue(value, target, adapter)),
		} as ValueListNode;
	}

	return node;
};

/** Encodes INSERT rows by matching their positional values to declared columns. */
export const encodeInsertValues = (
	node: InsertQueryNode,
	table: string | undefined,
	adapter: DatabaseAdapter,
	registry: TableRegistry,
): InsertQueryNode => {
	if (!table || node.values?.kind !== "ValuesNode" || !node.columns)
		return node;

	const definition = registry.resolve(table);
	const targets = node.columns.map((column): CodecTarget | undefined => {
		const name = columnName(column);
		const resolved = name ? definition?.columns[name] : undefined;
		return resolved
			? { codec: resolved.codec, columnType: resolved.dataType }
			: undefined;
	});
	const values = node.values as ValuesNode;

	return {
		...node,
		values: {
			...values,
			values: values.values.map((row) => {
				if (row.kind === "PrimitiveValueListNode") {
					return {
						...row,
						values: row.values.map((value, index) => {
							const target = targets[index];
							return target?.codec.encodes
								? target.codec.encode(value, {
										adapter,
										columnType: target.columnType,
									})
								: value;
						}),
					};
				}

				return {
					...row,
					values: row.values.map((value, index) => {
						const target = targets[index];
						return target ? encodeValue(value, target, adapter) : value;
					}),
				};
			}),
		} as ValuesNode,
	};
};

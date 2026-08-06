import type {
	Executable,
	KyselyPlugin,
	OperationNode,
	PluginTransformQueryArgs,
	PluginTransformResultArgs,
	QueryResult,
	RootOperationNode,
	UnknownRow,
} from "kysely";
import { tableName } from "./operation-node.js";

type PluginExecutable<Output> = Executable<Output> & {
	withPlugin(plugin: KyselyPlugin): Executable<Output>;
};

const isPluginExecutable = <Output>(
	query: Executable<Output>,
): query is PluginExecutable<Output> =>
	"withPlugin" in query &&
	typeof (query as Partial<PluginExecutable<Output>>).withPlugin === "function";

const cteExpression = (
	node: RootOperationNode,
	name: string,
): OperationNode | undefined =>
	(
		node as RootOperationNode & {
			with?: {
				expressions: readonly {
					name: { table: OperationNode };
					expression: OperationNode;
				}[];
			};
		}
	).with?.expressions.find(
		(expression) => tableName(expression.name.table) === name,
	)?.expression;

const sourceTableName = (
	root: RootOperationNode,
	source: OperationNode | undefined,
): string | undefined => {
	if (!source) return undefined;
	if (source.kind === "AliasNode") {
		return sourceTableName(
			root,
			(source as OperationNode & { node: OperationNode }).node,
		);
	}
	if (source.kind === "SelectQueryNode") return queryNodeTableName(source);

	const name = tableName(source);
	if (!name) return undefined;
	const cte = cteExpression(root, name);
	return cte?.kind === "SelectQueryNode" ? queryNodeTableName(cte) : name;
};

/** Finds the primary physical table represented by a Kysely query tree. */
export const queryNodeTableName = (node: OperationNode): string | undefined => {
	switch (node.kind) {
		case "SelectQueryNode": {
			const query = node as RootOperationNode & {
				from?: { froms: readonly OperationNode[] };
			};
			return sourceTableName(query, query.from?.froms[0]);
		}
		case "InsertQueryNode":
		case "UpdateQueryNode":
		case "MergeQueryNode": {
			const query = node as RootOperationNode & {
				into?: OperationNode;
				table?: OperationNode;
			};
			return sourceTableName(query, query.into ?? query.table);
		}
		case "DeleteQueryNode": {
			const query = node as RootOperationNode & {
				from: { froms: readonly OperationNode[] };
			};
			return sourceTableName(query, query.from.froms[0]);
		}
		default:
			return undefined;
	}
};

class QueryMetadataPlugin implements KyselyPlugin {
	readonly #onTableName: (tableName: string) => void;

	constructor(onTableName: (tableName: string) => void) {
		this.#onTableName = onTableName;
	}

	transformQuery(args: PluginTransformQueryArgs): RootOperationNode {
		const name = queryNodeTableName(args.node);
		if (name) this.#onTableName(name);
		return args.node;
	}

	async transformResult(
		args: PluginTransformResultArgs,
	): Promise<QueryResult<UnknownRow>> {
		return args.result;
	}
}

/** Captures query metadata during Kysely's existing compilation pass. */
export const captureQueryTableName = <Output>(
	query: Executable<Output>,
	onTableName: (tableName: string) => void,
): Executable<Output> =>
	isPluginExecutable(query)
		? query.withPlugin(new QueryMetadataPlugin(onTableName))
		: query;

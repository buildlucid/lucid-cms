import type {
	KyselyPlugin,
	PluginTransformQueryArgs,
	PluginTransformResultArgs,
	QueryResult,
	RootOperationNode,
	UnknownRow,
} from "kysely";

/**
 * Counts queries and their time from compilation to returned rows. Concurrent query times are
 * summed and may exceed wall time. Attach with `LucidDatabase.withPlugin()`.
 */
export default class QueryCountPlugin implements KyselyPlugin {
	#count = 0;
	#durationMs = 0;
	readonly #startedAt = new WeakMap<object, number>();

	/** Queries that returned. Failed queries are not counted. */
	get count(): number {
		return this.#count;
	}

	get durationMs(): number {
		return this.#durationMs;
	}

	transformQuery(args: PluginTransformQueryArgs): RootOperationNode {
		this.#startedAt.set(args.queryId, performance.now());
		return args.node;
	}

	async transformResult(
		args: PluginTransformResultArgs,
	): Promise<QueryResult<UnknownRow>> {
		const startedAt = this.#startedAt.get(args.queryId);
		if (startedAt !== undefined) {
			this.#count++;
			this.#durationMs += performance.now() - startedAt;
		}
		return args.result;
	}
}

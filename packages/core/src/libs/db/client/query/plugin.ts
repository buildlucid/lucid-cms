import type {
	KyselyPlugin,
	PluginTransformQueryArgs,
	PluginTransformResultArgs,
	QueryResult,
	RootOperationNode,
	UnknownRow,
} from "kysely";
import type DatabaseAdapter from "../../adapter-base.js";
import type TableRegistry from "../table/registry.js";
import InputCodecTransformer from "./input/transformer.js";
import {
	createResultPlan,
	decodeResultRow,
	type ResultPlan,
} from "./result/plan.js";

/** Applies input codecs during compilation and planned decoders to query rows. */
export default class LucidQueryPlugin implements KyselyPlugin {
	readonly #adapter: DatabaseAdapter;
	readonly #plans = new WeakMap<object, ResultPlan>();
	readonly #transformer: InputCodecTransformer;
	readonly #registry: TableRegistry;

	constructor(adapter: DatabaseAdapter, registry: TableRegistry) {
		this.#adapter = adapter;
		this.#registry = registry;
		this.#transformer = new InputCodecTransformer(adapter, registry);
	}

	transformQuery(args: PluginTransformQueryArgs): RootOperationNode {
		const plan = createResultPlan(args.node, this.#registry);
		if (Object.keys(plan).length > 0) {
			this.#plans.set(args.queryId, plan);
		}
		const transformed = this.#transformer.transformNode(
			args.node,
			args.queryId,
		);
		this.#transformer.markTransformedRoot(transformed);
		return transformed;
	}

	async transformResult(
		args: PluginTransformResultArgs,
	): Promise<QueryResult<UnknownRow>> {
		const plan = this.#plans.get(args.queryId);
		if (!plan) return args.result;

		return {
			...args.result,
			rows: args.result.rows.map(
				(row) => decodeResultRow(row, plan, this.#adapter) as UnknownRow,
			),
		};
	}
}

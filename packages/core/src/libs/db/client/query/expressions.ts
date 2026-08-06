import {
	type AliasableExpression,
	type AliasedExpression,
	AliasNode,
	type Expression,
	IdentifierNode,
	type OperationNode,
	type SelectQueryNode,
	type ShallowDehydrateObject,
	type Simplify,
} from "kysely";
import type DatabaseAdapter from "../../adapter-base.js";
import type { DatabaseCodec } from "../codecs/types.js";
import { type TaggedResult, tagResultNode } from "./result/plan.js";

type SelectExpression<O> = AliasableExpression<O> & {
	readonly isSelectQueryBuilder: true;
	toOperationNode(): SelectQueryNode;
};

/** Reuses one transformed subquery tree across dialect helper inspection and SQL. */
const withCachedNode = <O extends object>(
	node: SelectQueryNode,
): SelectExpression<O> =>
	({
		isSelectQueryBuilder: true,
		toOperationNode: () => node,
	}) as SelectExpression<O>;

class TaggedExpression<T> implements AliasableExpression<T> {
	readonly #expression: Expression<T>;
	readonly #tag: TaggedResult;

	constructor(expression: Expression<T>, tag: TaggedResult) {
		this.#expression = expression;
		this.#tag = tag;
	}

	get expressionType(): T | undefined {
		return undefined;
	}

	toOperationNode(): OperationNode {
		const node = this.#expression.toOperationNode();
		tagResultNode(node, this.#tag);
		return node;
	}

	as<A extends string>(alias: A): AliasedExpression<T, A>;
	as<A extends string>(alias: Expression<unknown>): AliasedExpression<T, A>;
	as<A extends string>(
		alias: A | Expression<unknown>,
	): AliasedExpression<T, A> {
		return new TaggedAliasedExpression(this, alias, this.#tag);
	}
}

class TaggedAliasedExpression<T, A extends string>
	implements AliasedExpression<T, A>
{
	readonly #expression: Expression<T>;
	readonly #alias: A | Expression<unknown>;
	readonly #tag: TaggedResult;

	constructor(
		expression: Expression<T>,
		alias: A | Expression<unknown>,
		tag: TaggedResult,
	) {
		this.#expression = expression;
		this.#alias = alias;
		this.#tag = tag;
	}

	get expression(): Expression<T> {
		return this.#expression;
	}

	get alias(): A | Expression<unknown> {
		return this.#alias;
	}

	toOperationNode(): AliasNode {
		const node = AliasNode.create(
			this.#expression.toOperationNode(),
			typeof this.#alias === "string"
				? IdentifierNode.create(this.#alias)
				: this.#alias.toOperationNode(),
		);
		tagResultNode(node, this.#tag);
		return node;
	}
}

/** Adapter-aware expression helpers that preserve result decoding metadata. */
export default class LucidDatabaseFunctions {
	readonly #adapter: DatabaseAdapter;

	constructor(adapter: DatabaseAdapter) {
		this.#adapter = adapter;
	}

	/**
	 * Creates the adapter-specific JSON aggregation SQL and attaches the nested
	 * query plan needed to decode only the aggregate's declared output path.
	 */
	jsonArrayFrom<O extends object>(
		expression: SelectExpression<O>,
	): AliasableExpression<Simplify<ShallowDehydrateObject<O>>[]> {
		const source = expression.toOperationNode() as SelectQueryNode;
		const aggregate = this.#adapter.jsonArrayFrom(withCachedNode<O>(source));
		return new TaggedExpression(aggregate, { kind: "json-array", source });
	}

	/** Annotates a computed Kysely expression with an explicit result codec. */
	withCodec<T>(
		expression: Expression<T>,
		codec: DatabaseCodec<T>,
	): AliasableExpression<T> {
		return new TaggedExpression(expression, { kind: "codec", codec });
	}
}

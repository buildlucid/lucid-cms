import type { OperationNode } from "kysely";
import type { TaggedResult } from "./types.js";

const taggedResults = new WeakMap<OperationNode, TaggedResult>();

/** Attaches non-SQL result metadata to an expression operation node. */
export const tagResultNode = (node: OperationNode, tag: TaggedResult) => {
	taggedResults.set(node, tag);
};

export const getTaggedResult = (
	node: OperationNode,
): TaggedResult | undefined => taggedResults.get(node);

/** Preserves result metadata when a Kysely plugin clones an operation node. */
export const transferResultTag = (
	source: OperationNode,
	target: OperationNode,
) => {
	const tag = getTaggedResult(source);
	if (tag) taggedResults.set(target, tag);
};

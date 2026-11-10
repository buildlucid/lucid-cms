import type { FieldNode } from "./types.js";

/** Visits every node in a field tree, containers before the fields inside them. */
const walkFieldNodes = (
	nodes: readonly FieldNode[],
	visit: (node: FieldNode) => void,
) => {
	for (const node of nodes) {
		visit(node);
		if (node.options && "fields" in node.options) {
			walkFieldNodes(node.options.fields, visit);
		}
	}
};

export default walkFieldNodes;

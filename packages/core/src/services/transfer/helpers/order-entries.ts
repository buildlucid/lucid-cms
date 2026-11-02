import type { TransferRefs } from "@lucidcms/types";
import transferKey from "./transfer-key.js";

/**
 * Orders dependencies first, preserving file order otherwise. Cycles retain file order and defer
 * links to a later pass.
 */
const orderTransferEntries = <
	T extends { resource: string; uid: string; refs?: TransferRefs },
>(
	items: T[],
): T[] => {
	const byKey = new Map<string, T>();
	for (const item of items) {
		const key = transferKey(item.resource, item.uid);
		if (!byKey.has(key)) byKey.set(key, item);
	}

	const ordered: T[] = [];
	const visited = new Set<T>();
	const visit = (item: T) => {
		if (visited.has(item)) return;
		visited.add(item);

		for (const [resource, refs] of Object.entries(item.refs ?? {})) {
			for (const uid of Object.values(refs)) {
				const target = byKey.get(transferKey(resource, uid));
				if (target) visit(target);
			}
		}
		ordered.push(item);
	};
	for (const item of items) visit(item);

	return ordered;
};

export default orderTransferEntries;

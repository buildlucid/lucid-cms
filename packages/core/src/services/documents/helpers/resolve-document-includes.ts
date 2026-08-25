import { isRefResource } from "../../../libs/refs/registry.js";
import type { RefResourceSelection } from "../../../libs/refs/types.js";
import type { RefResource } from "../../../types.js";

type DocumentRefInclude = "refs" | `refs.${RefResource}`;
type DocumentInclude = "bricks" | "meta" | DocumentRefInclude;

export type ResolvedDocumentIncludes = {
	bricks: boolean;
	refs: RefResourceSelection;
	meta: boolean;
};

const refsPrefix = "refs.";

/**
 * Normalizes document include query values into service flags.
 *
 * `refs` exposes every collected core resource. `refs.<resource>` narrows the
 * public bag while fields can still hydrate resources needed during formatting.
 */
const resolveDocumentIncludes = (
	include?: DocumentInclude[] | string[],
): ResolvedDocumentIncludes => {
	const includeValues = include ?? [];
	const includesAllRefs = includeValues.includes("refs");
	const requestedResources = new Set<RefResource>();

	for (const includeValue of includeValues) {
		if (!includeValue.startsWith(refsPrefix)) continue;

		const resource = includeValue.slice(refsPrefix.length);
		if (isRefResource(resource)) {
			requestedResources.add(resource);
		}
	}

	return {
		bricks: includeValues.includes("bricks"),
		refs: includesAllRefs
			? "all"
			: requestedResources.size > 0
				? [...requestedResources]
				: null,
		meta: includeValues.includes("meta"),
	};
};

export default resolveDocumentIncludes;

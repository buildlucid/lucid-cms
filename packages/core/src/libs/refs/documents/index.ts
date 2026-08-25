import getDocumentRefs from "../../../services/documents/get-refs.js";
import type { RefResourceDefinition } from "../types.js";
import formatDocumentRefs from "./format.js";
import type { DocumentRefResolveInput } from "./types.js";

const documentRefResource = {
	resource: "documents",
	resolve: async (context, data) => {
		const refsRes = await getDocumentRefs(context, {
			targets: data.targets,
			versionType: data.versionType,
			resolveVersionType: data.resolveVersionType,
			allowedCollectionKeys: data.allowedCollectionKeys,
		});
		if (refsRes.error) return refsRes;

		return {
			error: undefined,
			data: {
				documents: formatDocumentRefs(refsRes.data, data.format),
			},
		};
	},
} satisfies RefResourceDefinition<"documents", DocumentRefResolveInput>;

export default documentRefResource;

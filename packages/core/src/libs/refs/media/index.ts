import getMediaRefs from "../../../services/media/get-refs.js";
import type { RefResourceDefinition } from "../types.js";
import formatMediaRefs from "./format.js";
import type { MediaRefResolveInput } from "./types.js";

const mediaRefResource = {
	resource: "media",
	resolve: async (context, data) => {
		const refsRes = await getMediaRefs(context, {
			targets: data.targets,
		});
		if (refsRes.error) return refsRes;

		return {
			error: undefined,
			data: {
				media: formatMediaRefs(refsRes.data, data.format),
			},
		};
	},
} satisfies RefResourceDefinition<"media", MediaRefResolveInput>;

export default mediaRefResource;

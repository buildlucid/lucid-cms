import getEmailRefs from "../../../services/email/get-refs.js";
import type { RefResourceDefinition } from "../types.js";
import formatEmailRefs from "./format.js";
import type { EmailRefResolveInput } from "./types.js";

const emailRefResource = {
	resource: "emails",
	resolve: async (context, data) => {
		const refsRes = await getEmailRefs(context, {
			targets: data.targets,
		});
		if (refsRes.error) return refsRes;

		return {
			error: undefined,
			data: {
				emails: formatEmailRefs(refsRes.data, data.format),
			},
		};
	},
} satisfies RefResourceDefinition<"emails", EmailRefResolveInput>;

export default emailRefResource;

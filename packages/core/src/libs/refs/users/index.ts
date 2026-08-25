import getUserRefs from "../../../services/users/get-refs.js";
import type { RefResourceDefinition } from "../types.js";
import formatUserRefs from "./format.js";
import type { UserRefResolveInput } from "./types.js";

const userRefResource = {
	resource: "users",
	resolve: async (context, data) => {
		const refsRes = await getUserRefs(context, {
			targets: data.targets,
		});
		if (refsRes.error) return refsRes;

		return {
			error: undefined,
			data: {
				users: formatUserRefs(refsRes.data, data.format),
			},
		};
	},
} satisfies RefResourceDefinition<"users", UserRefResolveInput>;

export default userRefResource;

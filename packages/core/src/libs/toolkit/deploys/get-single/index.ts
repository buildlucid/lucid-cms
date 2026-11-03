import type z from "zod";
import type { Deploy } from "../../../../types/response.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { runToolkitService } from "../../utils.js";
import { inputSchema } from "./schema.js";

export type ToolkitDeploysGetSingleInput = z.input<typeof inputSchema>;

/** Returns one deploy with its on/off state, waiting triggers and current runs. */
const getSingle = (
	context: ServiceContext,
	input: ToolkitDeploysGetSingleInput,
): ServiceResponse<Deploy> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async (data) => {
			const { default: getDeploy } =
				await import("../../../../services/deploys/get-single.js");

			return getDeploy(context, data);
		},
		name: { key: "core.toolkit.deploys.error.name" },
		message: { key: "core.toolkit.deploys.get.error.message" },
	});

export default getSingle;

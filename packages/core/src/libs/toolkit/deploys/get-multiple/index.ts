import type { Deploy } from "../../../../types/response.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { runToolkitService } from "../../utils.js";

/** Returns every configured deploy with its on/off state, waiting triggers and current runs. */
const getMultiple = (context: ServiceContext): ServiceResponse<Deploy[]> =>
	runToolkitService({
		handler: async () => {
			const [{ default: getDeploys }, { default: systemActor }] =
				await Promise.all([
					import("../../../../services/deploys/get-multiple.js"),
					import("../../../permission/system-actor.js"),
				]);

			return getDeploys(context, { actor: systemActor });
		},
		name: { key: "core.toolkit.deploys.error.name" },
		message: { key: "core.toolkit.deploys.get.error.message" },
	});

export default getMultiple;

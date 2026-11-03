import type z from "zod";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { copy } from "../../../i18n/index.js";
import { getDeployPermission } from "../../../permission/deploy-permissions.js";
import hasAccess from "../../../permission/has-access.js";
import { runToolkitService } from "../../utils.js";
import { inputSchema } from "./schema.js";

export type ToolkitDeploysRunInput = z.input<typeof inputSchema>;

/**
 * Runs a deploy now, skipping its debounce, or queues it behind the run in progress. Returns the
 * run's ID.
 */
const run = (
	context: ServiceContext,
	input: ToolkitDeploysRunInput,
): ServiceResponse<{ id: number }> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async ({ actor, key }) => {
			const [
				{ default: resolveActorUser },
				{ default: serviceWrapper },
				{ default: runDeploy },
			] = await Promise.all([
				import("../../../../services/users/helpers/resolve-actor-user.js"),
				import("../../../../utils/services/service-wrapper.js"),
				import("../../../../services/deploys/run.js"),
			]);

			return serviceWrapper(
				async (context: ServiceContext): ServiceResponse<{ id: number }> => {
					if (actor.type === "user") {
						const user = await resolveActorUser(context, { actor });
						if (user.error) return user;
						if (
							!hasAccess({
								user: user.data,
								requiredPermissions: [getDeployPermission(key, "run")],
							})
						) {
							return {
								error: {
									type: "authorisation",
									status: 403,
									message: copy("server:core.deploys.run.forbidden"),
								},
								data: undefined,
							};
						}
					}

					return runDeploy(context, {
						key,
						source: "toolkit",
						userId: actor.type === "user" ? actor.userId : null,
					});
				},
				{ transaction: true },
			)(context);
		},
		name: { key: "core.toolkit.deploys.error.name" },
		message: { key: "core.toolkit.deploys.run.error.message" },
	});

export default run;

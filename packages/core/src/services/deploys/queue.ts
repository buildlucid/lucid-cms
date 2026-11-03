import { getDeploy } from "../../libs/deploys/registry.js";
import { copy } from "../../libs/i18n/index.js";
import { DeployTriggersRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

/**
 * Queues a debounced deploy trigger.
 * @remarks Call in the change's transaction so rollback also drops the trigger.
 */
const queueDeploy: ServiceFn<[{ key: string }], undefined> = async (
	context,
	data,
) => {
	if (!getDeploy(context.config, data.key)) {
		return {
			error: {
				type: "basic",
				status: 404,
				message: copy("server:core.deploys.not.found", {
					data: { deploy: data.key },
				}),
			},
			data: undefined,
		};
	}

	const DeployTriggers = new DeployTriggersRepository(context.db);
	const created = await DeployTriggers.createSingle({
		data: { deploy_key: data.key, created_at: new Date().toISOString() },
	});
	if (created.error) return created;

	return { error: undefined, data: undefined };
};

export default queueDeploy;

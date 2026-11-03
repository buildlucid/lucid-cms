import constants from "../../constants/constants.js";
import queueDeploy from "../../services/deploys/queue.js";
import type { ServiceContext } from "../../utils/services/types.js";
import type { AllHooks } from "../hooks/types.js";
import logger from "../logger/index.js";
import type { DeployDefinition } from "./types.js";

type TriggerWhen = (props: {
	context: ServiceContext;
}) => boolean | Promise<boolean>;

/** Turns deploy triggers into hooks that queue their deploy whenever `when` allows it. */
const createDeployTriggerHooks = (
	deploys: readonly DeployDefinition[],
): AllHooks[] =>
	deploys.flatMap((deploy) =>
		deploy.triggers.map((trigger) => {
			// The service and event pair the hook's payload with this `when`, as they do for hook handlers.
			const when = trigger.when as TriggerWhen | undefined;

			return {
				service: trigger.service,
				event: trigger.event,
				handler: async (props: { context: ServiceContext }) => {
					if (when) {
						let matched = false;
						try {
							matched = await when(props);
						} catch (error) {
							logger.warn({
								message: `A ${deploy.key} deploy trigger threw, so it didn't queue the deploy`,
								scope: constants.logScopes.deploys,
								data: {
									trigger: `${trigger.service}.${String(trigger.event)}`,
									reason:
										error instanceof Error ? error.message : String(error),
								},
							});
						}
						if (!matched) return { error: undefined, data: undefined };
					}

					return queueDeploy(props.context, { key: deploy.key });
				},
			} as AllHooks;
		}),
	);

export default createDeployTriggerHooks;

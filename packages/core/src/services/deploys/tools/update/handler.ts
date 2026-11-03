import type z from "zod";
import { copy } from "../../../../libs/i18n/index.js";
import type { ToolkitActor } from "../../../../libs/permission/toolkit-actor.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import resolveActorUser from "../../../users/helpers/resolve-actor-user.js";
import cancelRun from "../../cancel-run.js";
import getSingle from "../../get-single.js";
import type { inputSchema, outputSchema } from "./schema.js";

/** Cancels a deploy's running or queued run for the actor, who needs the deploy's `manage` permission. */
const updateDeploy: ServiceFn<
	[{ input: z.output<typeof inputSchema>; actor: ToolkitActor }],
	{ output: z.output<typeof outputSchema> }
> = async (context, props) => {
	const actor = await resolveActorUser(context, { actor: props.actor });
	if (actor.error) return actor;

	const deploy = await getSingle(context, { key: props.input.key });
	if (deploy.error) return deploy;

	const run =
		props.input.action === "cancel-queued"
			? deploy.data.queuedRun
			: deploy.data.runningRun;
	if (!run) {
		return {
			error: {
				type: "basic",
				status: 404,
				message: copy("server:core.deploys.run.none"),
			},
			data: undefined,
		};
	}

	const cancelled = await cancelRun(context, { id: run.id, actor: actor.data });
	if (cancelled.error) return cancelled;

	return {
		error: undefined,
		data: {
			output: {
				runId: run.id,
				result:
					run.status === "queued"
						? "dropped"
						: run.status === "running" && deploy.data.cancellable
							? "stopped"
							: "stopped-waiting",
			},
		},
	};
};

export default updateDeploy;

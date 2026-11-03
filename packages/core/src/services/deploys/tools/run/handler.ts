import type z from "zod";
import { copy } from "../../../../libs/i18n/index.js";
import { getDeployPermission } from "../../../../libs/permission/deploy-permissions.js";
import hasAccess from "../../../../libs/permission/has-access.js";
import type { ToolkitActor } from "../../../../libs/permission/toolkit-actor.js";
import { DeployRunsRepository } from "../../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import register from "../../../agent/references/register.js";
import resolveActorUser from "../../../users/helpers/resolve-actor-user.js";
import runDeploy from "../../run.js";
import type { inputSchema, outputSchema } from "./schema.js";

/** Runs a permitted deploy with agent attribution and links its live status to the chat. */
const runDeployTool: ServiceFn<
	[
		{
			input: z.output<typeof inputSchema>;
			actor: ToolkitActor;
			agentRunId: string;
			conversationId: string;
		},
	],
	{ output: z.output<typeof outputSchema> }
> = async (context, props) => {
	const actor = await resolveActorUser(context, { actor: props.actor });
	if (actor.error) return actor;
	if (
		!hasAccess({
			user: actor.data,
			requiredPermissions: [getDeployPermission(props.input.key, "run")],
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

	const run = await runDeploy(context, {
		key: props.input.key,
		source: "agent",
		userId: actor.data.id,
		agentRunId: props.agentRunId,
	});
	if (run.error) return run;

	const DeployRuns = new DeployRunsRepository(context.db);
	const status = await DeployRuns.selectSingle({
		select: ["status"],
		where: [{ key: "id", operator: "=", value: run.data.id }],
	});
	if (status.error) return status;

	const linked = await register(context, {
		conversationId: props.conversationId,
		references: [{ type: "deploy", deployKey: props.input.key }],
		source: { type: "tool", toolName: "deploys_run" },
		managed: true,
	});
	if (linked.error) return linked;

	return {
		error: undefined,
		data: {
			output: {
				runId: run.data.id,
				queued: status.data?.status === "queued",
			},
		},
	};
};

export default runDeployTool;

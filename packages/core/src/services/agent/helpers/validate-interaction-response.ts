import constants from "../../../constants/constants.js";
import {
	approvalBatchResponseSchema,
	type InteractionAnswer,
	type PendingInteraction,
	questionResponseSchema,
} from "../../../libs/agent/interactions.js";
import type { Checkpoint } from "../../../libs/agent/types.js";
import { copy } from "../../../libs/i18n/index.js";
import { getConversationPermission } from "../../../libs/permission/agent-permissions.js";
import { toolDefinitionInternal } from "../../../libs/tools/registry.js";
import type { AgentInteractionAction } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import checkAgentAccess from "./check-agent-access.js";
import resolveRunSetup from "./resolve-run-setup.js";
import type { SessionRun } from "./run-session.js";

/**
 * Users answer their own runs; agent managers answer system runs. Execution
 * keeps the original authority. Responses use the saved interaction and current schemas.
 */
const validateInteractionResponse: ServiceFn<
	[
		{
			run: SessionRun;
			checkpoint: Checkpoint;
			pending: PendingInteraction;
			response: Record<string, unknown>;
			action: AgentInteractionAction;
			userId: number;
		},
	],
	InteractionAnswer
> = async (context, props) => {
	const { pending, run, checkpoint } = props;
	if (run.user_id !== null && run.user_id !== props.userId) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 403,
				message: copy("server:agent.interaction.forbidden"),
			},
		};
	}

	const access = await checkAgentAccess(context, {
		userId: props.userId,
		agentKey: run.agent_key,
		action: getConversationPermission(run.conversation_kind),
	});
	if (access.error) return access;
	if (props.action === "cancel") {
		return { error: undefined, data: { action: "cancel" } };
	}

	const { widgets } = constants.agent;
	//* built-in widgets accept answers for their current version only; older ones can still be cancelled
	if (
		pending.widget.key.startsWith(widgets.reservedPrefix) &&
		pending.widget.version !== 1
	) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 409,
				message: copy("server:agent.interaction.unavailable"),
			},
		};
	}
	if (pending.widget.key === widgets.approval) {
		return { error: undefined, data: { action: "submit", response: {} } };
	}
	if (pending.widget.key === widgets.approvalBatch) {
		const parsed = approvalBatchResponseSchema.safeParse(props.response);
		const ids = parsed.data?.approvedToolCallIds ?? [];
		const offered = new Set(
			pending.widget.interaction.approvals?.map(
				(approval) => approval.toolCallId,
			),
		);

		//* each approved call must be one this widget offered, listed once
		const valid =
			parsed.success &&
			offered.size > 0 &&
			new Set(ids).size === ids.length &&
			ids.every((id) => offered.has(id));
		if (!valid) {
			return {
				data: undefined,
				error: {
					type: "basic",
					status: 400,
					message: copy("server:agent.interaction.invalid"),
				},
			};
		}

		return {
			error: undefined,
			data: { action: "submit", response: { approvedToolCallIds: ids } },
		};
	}

	if (pending.widget.key === widgets.question) {
		const parsed = questionResponseSchema.safeParse(props.response);
		if (!parsed.success) {
			return {
				data: undefined,
				error: {
					type: "basic",
					status: 400,
					message: copy("server:agent.interaction.invalid"),
				},
			};
		}

		return {
			error: undefined,
			data: { action: "submit", response: parsed.data },
		};
	}

	const executionAccess = await checkAgentAccess(context, {
		userId: run.user_id,
		agentKey: run.agent_key,
		action: getConversationPermission(run.conversation_kind),
	});
	if (executionAccess.error) return executionAccess;

	const call = checkpoint.calls[checkpoint.cursor];
	const tool = resolveRunSetup(context, {
		...executionAccess.data,
		mode: run.routine_id ? "routine" : "chat",
		hasHistory: checkpoint.trimmed === true,
	}).tools.find((tool) => tool.name === call?.name);
	const interaction = tool?.[toolDefinitionInternal].interaction;

	if (
		!interaction ||
		tool?.interaction?.key !== pending.widget.key ||
		tool.interaction.version !== pending.widget.version
	) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 409,
				message: copy("server:agent.interaction.unavailable"),
			},
		};
	}

	const response = await interaction.parseResponse(
		pending.widget.data,
		props.response,
	);
	if (response.error) return response;

	return {
		error: undefined,
		data: { action: "submit", response: response.data },
	};
};

export default validateInteractionResponse;

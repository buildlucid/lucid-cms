import constants from "../../../constants/constants.js";
import {
	type InteractionAnswer,
	type PendingInteraction,
	questionResponseSchema,
} from "../../../libs/agent/interactions.js";
import type { Checkpoint } from "../../../libs/agent/types.js";
import { copy } from "../../../libs/i18n/index.js";
import { toolDefinitionInternal } from "../../../libs/tools/registry.js";
import type { AgentInteractionAction } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import checkAgentAccess, {
	getConversationLevel,
} from "./check-agent-access.js";
import resolveCapabilities from "./resolve-capabilities.js";
import type { SessionRun } from "./run-session.js";

/**
 * Only the person a run acts for can answer it, so a response never borrows
 * someone else's permissions. Responses are checked against the saved
 * interaction and the tool's current schemas before the run is claimed.
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
	if (run.user_id !== props.userId) {
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
		level: getConversationLevel(run.conversation_user_id),
	});
	if (access.error) return access;
	if (props.action === "cancel") {
		return { error: undefined, data: { action: "cancel" } };
	}

	const { widgets } = constants.agent;
	if (pending.widget.key === widgets.approval) {
		return { error: undefined, data: { action: "submit", response: {} } };
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

	const call = checkpoint.calls[checkpoint.cursor];
	const tool = resolveCapabilities(context, {
		...access.data,
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

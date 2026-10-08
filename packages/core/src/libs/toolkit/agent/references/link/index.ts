import type z from "zod";
import type { AgentReferenceSnapshot } from "../../../../../types/response.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../../utils/services/types.js";
import { runToolkitService } from "../../../utils.js";
import { inputSchema } from "./schema.js";

export type ToolkitAgentReferencesLinkInput = z.input<typeof inputSchema>;

/**
 * Links resources to a chat as managed references, returning what was linked
 * with its current details. Neither people nor the agent can remove them, and
 * existing links to the same resources become managed.
 */
const link = (
	context: ServiceContext,
	input: ToolkitAgentReferencesLinkInput,
): ServiceResponse<AgentReferenceSnapshot[]> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async (data) => {
			const { default: register } = await import(
				"../../../../../services/agent/references/register.js"
			);

			return register(context, {
				conversationId: data.conversationId,
				references: data.references,
				source: { type: "tool", toolName: data.toolName },
				managed: true,
			});
		},
		name: {
			key: "core.toolkit.agent.references.link.error.name",
			defaultMessage: "Agent Toolkit Error",
		},
		message: {
			key: "core.toolkit.agent.references.link.error.message",
			defaultMessage: "Lucid toolkit could not link the chat references.",
		},
	});

export default link;

import z from "zod";
import { agentRunOutcomeSchema } from "../../schemas/agent.js";
import { agentReferenceInputSchema } from "../../schemas/agent-references.js";
import type {
	AgentRunnerToolName,
	AgentToolDisplay,
} from "../../types/response.js";
import { copy } from "../i18n/index.js";
import type { ResolvedAdminCopy } from "../i18n/types.js";
import { toolDisplay } from "../tools/tool-display.js";
import type { RunMode } from "./types.js";

export type RunnerToolContext = {
	mode: RunMode;
	hasSkills: boolean;
	hasHistory: boolean;
};

type RunnerToolDefinition = {
	name: AgentRunnerToolName;
	title: ResolvedAdminCopy;
	description: string;
	input: z.ZodObject;
	/** Describes a call in the chat from its input. */
	display?: (input: Record<string, unknown>) => AgentToolDisplay | undefined;
	/** Whether the tool is offered for a model turn. */
	available: (context: RunnerToolContext) => boolean;
};

const progressInput = z.object({
	message: z
		.string()
		.max(2000)
		.trim()
		.min(1)
		.describe("The message to show in the chat."),
});
const skillInput = z.object({ name: z.string() });
const finishInput = z.object({
	outcome: agentRunOutcomeSchema,
	summary: z.string().min(1).max(4000),
});

/**
 * Tools the runner handles itself: how an agent asks, checks in, reads back
 * history, loads skills and finishes. They always run and never need
 * approval. Their names are reserved, so agent tools cannot use them. Their
 * handlers live in `services/agent/helpers/runner-tools`.
 */
const runnerTools = {
	references: {
		name: "lucid_list_references",
		title: copy("admin:core.tools.lucid_list_references.title"),
		description:
			"List the media and documents linked to this chat, including those linked by tools, with their names and file types. This does not read their contents or grant access.",
		input: z.object({ offset: z.number().int().nonnegative().default(0) }),
		available: () => true,
	},
	registerReferences: {
		name: "lucid_register_references",
		title: copy("admin:core.tools.lucid_register_references.title"),
		description:
			"Add media or documents to this chat's references, the record of resources the chat involves. Call it when the person names, gives an ID for or picks a resource, and when you read, create or change one. Use IDs from their message or tool results. Linking again is harmless. This does not read contents or grant access.",
		input: z.object({
			references: z.array(agentReferenceInputSchema).min(1).max(50),
		}),
		available: () => true,
	},
	removeReference: {
		name: "lucid_remove_reference",
		title: copy("admin:core.tools.lucid_remove_reference.title"),
		description:
			"Remove a tool-added reference from this chat when it is no longer useful. Use its ID from lucid_list_references. This does not delete the resource or message attachments. User-attached references can only be removed by the user in the chat UI.",
		input: z.object({ referenceId: z.uuid() }),
		available: () => true,
	},
	ask: {
		name: "lucid_ask_user",
		title: copy("admin:core.tools.lucid_ask_user.title"),
		description:
			"Pause this run and ask a person a question. Use only when the task cannot continue without their information or decision.",
		input: z.object({
			question: z.string().min(1).max(2000),
			options: z.array(z.string().max(200)).max(10).optional(),
		}),
		available: () => true,
	},
	progress: {
		name: "lucid_share_progress",
		title: copy("admin:core.tools.lucid_share_progress.title"),
		description:
			"Send a normal assistant message without ending this chat run. Use before or between other tool calls when a multi-step task has a useful finding or decision to share. Continue working afterward.",
		input: progressInput,
		display: toolDisplay(progressInput, (input) => ({
			kind: "progress",
			message: input.message,
		})),
		available: ({ mode }) => mode === "chat",
	},
	history: {
		name: "lucid_read_history",
		title: copy("admin:core.tools.lucid_read_history.title"),
		description:
			"Recover exact earlier messages or tool results from this conversation, including history that was summarised or truncated. List positions first, then read a message in bounded character pages. Historical tool results may be stale; read current CMS data before editing.",
		input: z.object({
			messageId: z.uuid().optional(),
			after: z.number().int().nonnegative().default(0),
			offset: z.number().int().nonnegative().default(0),
		}),
		available: ({ hasHistory }) => hasHistory,
	},
	skill: {
		name: "lucid_load_skill",
		title: copy("admin:core.tools.lucid_load_skill.title"),
		description:
			"Load the instructions for an available skill before performing its task.",
		input: skillInput,
		display: toolDisplay(skillInput, (input) => ({
			kind: "skill",
			name: input.name,
		})),
		available: ({ hasSkills }) => hasSkills,
	},
	finish: {
		name: "lucid_finish_run",
		title: copy("admin:core.tools.lucid_finish_run.title"),
		description:
			"Finish this routine run once its goal is met. Summarise what you did and found for the next run and the people reviewing it.",
		input: finishInput,
		display: toolDisplay(finishInput, (input) => ({
			kind: "finish",
			outcome: input.outcome,
			summary: input.summary,
		})),
		available: ({ mode }) => mode === "routine",
	},
} as const satisfies Record<string, RunnerToolDefinition>;

export const runnerToolNames: ReadonlySet<string> = new Set(
	Object.values(runnerTools).map((tool) => tool.name),
);

/** The runner tools offered for a model turn. Config checks use the same list, so both agree. */
export const getRunnerTools = (
	props: RunnerToolContext,
): RunnerToolDefinition[] =>
	Object.values(runnerTools).filter((tool) => tool.available(props));

export default runnerTools;

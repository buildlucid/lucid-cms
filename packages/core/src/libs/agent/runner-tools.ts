import z from "zod";
import constants from "../../constants/constants.js";
import { agentRunOutcomeSchema } from "../../schemas/agent.js";
import { agentReferenceInputSchema } from "../../schemas/agent-references.js";
import type { AgentRunnerToolName } from "../../types/response.js";
import { copy } from "../i18n/index.js";
import type { ResolvedAdminCopy } from "../i18n/types.js";
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
	summary: z.string().trim().min(1).max(4000),
});

/**
 * Tools the runner handles itself: how an agent asks, checks in, reads back
 * history, loads skills and finishes. They always run and never need
 * approval. Their names are reserved, so agent tools cannot use them. Their
 * handlers live in `services/agent/helpers/runner-tools`.
 */
const runnerTools = {
	previewMedia: {
		name: "lucid_preview_media",
		title: copy("admin:core.tools.lucid_preview_media.title"),
		description: `Display up to ${constants.agent.previewMediaLimit} Lucid images, videos, or audio files in this chat as a preview gallery.`,
		input: z
			.object({
				mediaIds: z
					.array(z.number().int().positive())
					.min(1)
					.max(constants.agent.previewMediaLimit),
			})
			.strict(),
		available: () => true,
	},
	references: {
		name: "lucid_list_references",
		title: copy("admin:core.tools.lucid_list_references.title"),
		description:
			"List media and documents linked to this chat, including reference IDs, names, file types, and whether the tool that linked them manages them.",
		input: z.object({ offset: z.number().int().nonnegative().default(0) }),
		available: () => true,
	},
	registerReferences: {
		name: "lucid_register_references",
		title: copy("admin:core.tools.lucid_register_references.title"),
		description:
			"Link media or documents to this chat using their resource IDs. Existing references are reused.",
		input: z.object({
			references: z.array(agentReferenceInputSchema).min(1).max(50),
		}),
		available: () => true,
	},
	removeReference: {
		name: "lucid_remove_reference",
		title: copy("admin:core.tools.lucid_remove_reference.title"),
		description:
			"Remove a tool-added reference from this chat without deleting its resource. Message attachments are managed by the person in the chat UI, and managed references by the tool that linked them.",
		input: z.object({ referenceId: z.uuid() }),
		available: () => true,
	},
	ask: {
		name: "lucid_ask_user",
		title: copy("admin:core.tools.lucid_ask_user.title"),
		description:
			"Ask the person a question, with optional choices, and pause this run until they respond.",
		input: z.object({
			question: z.string().min(1).max(2000),
			options: z.array(z.string().max(200)).max(10).optional(),
		}),
		available: () => true,
	},
	progress: {
		name: "lucid_share_progress",
		title: copy("admin:core.tools.lucid_share_progress.title"),
		description: "Show a progress message in the chat without ending this run.",
		input: progressInput,
		available: () => true,
	},
	history: {
		name: "lucid_read_history",
		title: copy("admin:core.tools.lucid_read_history.title"),
		description:
			"Recover earlier conversation messages and tool results, including summarized or truncated history. Without messageId, returns a paginated list; with messageId, returns that message in character pages.",
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
		description: "Load task instructions for a configured skill by name.",
		input: skillInput,
		available: ({ hasSkills }) => hasSkills,
	},
	finish: {
		name: "lucid_finish_run",
		title: copy("admin:core.tools.lucid_finish_run.title"),
		description:
			"End this routine run with an outcome and a short summary for run history and future runs. Requires a reply with the result first.",
		input: finishInput,
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

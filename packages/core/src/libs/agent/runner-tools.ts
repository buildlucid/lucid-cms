import z from "zod";
import { agentRunOutcomeSchema } from "../../schemas/agent.js";
import { copy } from "../i18n/index.js";
import type { RunMode } from "./types.js";

export type RunnerToolContext = {
	mode: RunMode;
	hasSkills: boolean;
	hasHistory: boolean;
};

/**
 * Tools the runner handles itself: how an agent asks, checks in, reads back
 * history, loads skills and finishes. They always run and never need
 * approval. Their names are reserved, so agent tools cannot use them. Their
 * handlers live in `services/agent/helpers/runner-tools`.
 */
const runnerTools = {
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
		input: z.object({
			message: z
				.string()
				.max(2000)
				.trim()
				.min(1)
				.describe("The message to show in the chat."),
		}),
		available: ({ mode }: RunnerToolContext) => mode === "chat",
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
		available: ({ hasHistory }: RunnerToolContext) => hasHistory,
	},
	skill: {
		name: "lucid_load_skill",
		title: copy("admin:core.tools.lucid_load_skill.title"),
		description:
			"Load the instructions for an available skill before performing its task.",
		input: z.object({ name: z.string() }),
		available: ({ hasSkills }: RunnerToolContext) => hasSkills,
	},
	finish: {
		name: "lucid_finish_run",
		title: copy("admin:core.tools.lucid_finish_run.title"),
		description:
			"Finish this routine run once its goal is met. Summarise what you did and found for the next run and the people reviewing it.",
		input: z.object({
			outcome: agentRunOutcomeSchema,
			summary: z.string().min(1).max(4000),
		}),
		available: ({ mode }: RunnerToolContext) => mode === "routine",
	},
} as const;

export type RunnerToolName =
	(typeof runnerTools)[keyof typeof runnerTools]["name"];

export const runnerToolNames: ReadonlySet<string> = new Set(
	Object.values(runnerTools).map((tool) => tool.name),
);

/** The runner tools offered for a model turn. Config checks use the same list, so both agree. */
export const getRunnerTools = (props: RunnerToolContext) =>
	Object.values(runnerTools).filter((tool) => tool.available(props));

export default runnerTools;

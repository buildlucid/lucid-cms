import z from "zod";
import { agentRunOutcomeSchema } from "../../schemas/agent.js";
import type { RunMode } from "./types.js";

/** Tools the runner handles itself. Their names are reserved for agent tools. */
const builtInTools = {
	ask: {
		name: "lucid_ask_user",
		description:
			"Pause this run and ask a person a question. Use only when the task cannot continue without their information or decision.",
		input: z.object({
			question: z.string().min(1).max(2000),
			options: z.array(z.string().max(200)).max(10).optional(),
		}),
	},
	skill: {
		name: "lucid_load_skill",
		description:
			"Load the instructions for an available skill before performing its task.",
		input: z.object({ name: z.string() }),
	},
	finish: {
		name: "lucid_finish_run",
		description:
			"Finish this routine run once its goal is met. Summarise what you did and found for the next run and the people reviewing it.",
		input: z.object({
			outcome: agentRunOutcomeSchema,
			summary: z.string().min(1).max(4000),
		}),
	},
} as const;

export const builtInToolNames: ReadonlySet<string> = new Set(
	Object.values(builtInTools).map((tool) => tool.name),
);

/** Shared by config validation and runtime so provider limits include every runner tool. */
export const getRunnerTools = (props: {
	mode: RunMode;
	hasSkills: boolean;
}) => [
	builtInTools.ask,
	...(props.hasSkills ? [builtInTools.skill] : []),
	...(props.mode === "routine" ? [builtInTools.finish] : []),
];

export default builtInTools;

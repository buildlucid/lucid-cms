import {
	agentTools,
	copy,
	defineAgent,
	defineCollection,
	defineRoutine,
	defineTool,
	field,
	LucidError,
	lucidAgent,
	mcpTools,
	z,
} from "@lucidcms/core";
import type { LucidConfig } from "@lucidcms/core/types";
import { callTool, encodeScript, finishRoutine } from "../agent-script.ts";
import type { HarnessEnv } from "../config.ts";

/** The agent AI tests chat with. It has every built-in tool, direct document writes and the harness's tools. */
export const HARNESS_AGENT = "harness";
/** A second agent with only reads, for sub-agents and picking between agents. */
export const HELPER_AGENT = "harness-helper";

/** The collection event routines watch, which no other test writes to. */
export const BRIEF_KEY = "brief";

/** The routines defined in code. Each runs as the system. */
export const CODE_ROUTINES = {
	/** Starts when a brief is created. Its write needs confirmation, which a system run can't give. */
	briefing: "briefing",
	/** Only runs when started early. Its routine settings let the write through unconfirmed. */
	digest: "digest",
} as const;

/** The tags code routines write under, as `harness_write` records them. */
export const CODE_ROUTINE_TAGS = {
	briefing: "code-routine-briefing",
	digest: "code-routine-digest",
} as const;

/** A collection only routine tests create documents in, so its event routine never runs for other tests. */
export const BriefCollection = defineCollection({
	key: BRIEF_KEY,
	mode: "multiple",
	details: { labels: { singular: "Brief", plural: "Briefs" } },
	fields: [
		field.text("title", {
			validation: { required: true, zod: z.string().min(1).max(128) },
			useAsLabel: true,
		}),
	],
});

/** The collections the `ai` fragment needs. Add them to a setup's collections. */
export const aiCollections = [BriefCollection];

/** The data and answer of `harness_choose`'s interaction. */
const choiceData = z.object({ options: z.array(z.string()).min(1) });
const choiceResponse = z.object({ choice: z.string() });

/**
 * Scripted test tools for echo, gates, failures, confirmed writes and widget questions. Effects
 * and gates use the fake Lucid API so they work across runtimes.
 */
export const harnessTools = (lucidApi: string | undefined) => {
	const control = (path: string, init?: RequestInit) => {
		if (!lucidApi) {
			throw new Error("The harness's Lucid API is not set.");
		}
		return fetch(new URL(path, lucidApi), init);
	};

	const echo = defineTool({
		name: "harness_echo",
		title: "Echo",
		description: "Return the message unchanged.",
		input: z.object({ message: z.string().max(2_000) }),
		output: z.object({ message: z.string() }),
		readOnly: true,
		agent: { permissions: [], parallelSafe: true },
		mcp: { scopes: [] },
		handler: ({ input }) => ({
			output: { message: input.message },
			summary: copy.literal(`Echoed "${input.message}"`),
		}),
	});

	const wait = defineTool({
		name: "harness_wait",
		title: "Wait",
		description: "Wait until the harness opens a gate.",
		input: z.object({ gate: z.string().min(1).max(200) }),
		output: z.object({ opened: z.boolean() }),
		readOnly: true,
		agent: { permissions: [] },
		handler: async ({ input, execution }) => {
			const response = await control(
				`/harness/gates/${encodeURIComponent(input.gate)}?wait=1`,
				{ signal: execution.signal },
			);
			const status = (await response.json()) as { open: boolean };
			return { output: { opened: status.open } };
		},
	});

	const fail = defineTool({
		name: "harness_fail",
		title: "Fail",
		description: "Fail on purpose, with a Lucid error or an unexpected one.",
		input: z.object({ how: z.enum(["lucid", "throw"]) }),
		output: z.object({}),
		readOnly: true,
		agent: { permissions: [] },
		handler: ({ input }) => {
			if (input.how === "lucid") {
				throw new LucidError({
					status: 400,
					message: copy.literal("The harness tool failed on purpose."),
				});
			}
			throw new Error("The harness tool threw on purpose.");
		},
	});

	const write = defineTool({
		name: "harness_write",
		title: "Write",
		description: "Record a value under a tag. It needs confirmation.",
		input: z.object({
			tag: z.string().min(1).max(200),
			value: z.string().max(200).default(""),
		}),
		output: z.object({ written: z.boolean() }),
		agent: { permissions: [], requiresConfirmation: true },
		handler: async ({ input, execution }) => {
			await control(`/harness/effects/${encodeURIComponent(input.tag)}`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					value: input.value,
					operationId: execution.operationId,
					runId: execution.run.id,
					principal: execution.authority.principal,
				}),
			});
			return {
				output: { written: true },
				summary: copy.literal(`Wrote "${input.value}"`),
			};
		},
	});

	const choose = defineTool({
		name: "harness_choose",
		title: "Choose",
		description: "Ask the person to pick one of the options.",
		input: z.object({ options: z.array(z.string()).min(1).max(10) }),
		output: z.object({ choice: z.string() }),
		readOnly: true,
		agent: {
			permissions: [],
			interaction: {
				key: "harness-choice",
				version: 1,
				data: choiceData,
				response: ({ data }) =>
					choiceResponse.refine((answer) =>
						data.options.includes(answer.choice),
					),
				prepare: ({ input }) => ({
					interaction: {
						title: copy.literal("Choose an option"),
						placement: "inline",
						data: { options: input.options },
					},
				}),
			},
		},
		handler: ({ response }) => ({ output: { choice: response.choice } }),
	});

	return { echo, wait, fail, write, choose };
};

/**
 * Agents, routines and MCP for AI tests, which every setup spreads in. Lucid's API is the harness's
 * fake, so models answer from the scripts tests send (see `shared/agent-script.ts`).
 */
export const aiConfig = (
	env: Pick<HarnessEnv, "LUCID_CMS_INTERNAL_REMOTE_API_URL_OVERRIDE">,
) => {
	const tools = harnessTools(env.LUCID_CMS_INTERNAL_REMOTE_API_URL_OVERRIDE);

	const helper = defineAgent({
		key: HELPER_AGENT,
		name: "Harness Helper",
		description: "Reads content for the harness agent.",
		tools: [agentTools.read(), tools.echo],
		features: { subagents: false },
	});

	const harness = defineAgent({
		key: HARNESS_AGENT,
		name: "Harness",
		description: "Does what the test's script says.",
		tools: [
			agentTools.read(),
			agentTools.edit({ direct: true }),
			agentTools.media.update(),
			agentTools.media.select(),
			agentTools.aiUsage.get(),
			tools.echo,
			tools.wait,
			tools.fail,
			tools.write,
			tools.choose,
		],
		features: { subagents: [HELPER_AGENT] },
		routines: [
			defineRoutine({
				key: CODE_ROUTINES.briefing,
				name: "Briefing",
				//* a fixed script ID, so every process loading the config gives the same instructions
				instructions: encodeScript({
					id: CODE_ROUTINE_TAGS.briefing,
					offset: 0,
					turns: [
						callTool("harness_write", {
							tag: CODE_ROUTINE_TAGS.briefing,
							value: "briefed",
						}),
						finishRoutine("Briefing done."),
					],
				}),
				events: [
					{ event: "documents:created", filter: { collections: [BRIEF_KEY] } },
				],
			}),
			defineRoutine({
				key: CODE_ROUTINES.digest,
				name: "Digest",
				instructions: encodeScript({
					id: CODE_ROUTINE_TAGS.digest,
					offset: 0,
					turns: [
						callTool("harness_write", {
							tag: CODE_ROUTINE_TAGS.digest,
							value: "digested",
						}),
						finishRoutine("Digest done."),
					],
				}),
				//* never due during a run, so it only runs when a test starts it early
				schedule: { cron: "0 0 1 1 *", timezone: "UTC" },
				toolSettings: { harness_write: { requiresConfirmation: false } },
			}),
		],
	});

	return {
		ai: {
			agents: [lucidAgent, harness, helper],
			mcp: { tools: [mcpTools.all(), tools.echo] },
		},
	} satisfies Pick<LucidConfig, "ai">;
};

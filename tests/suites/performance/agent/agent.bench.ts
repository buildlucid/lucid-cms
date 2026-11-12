import path from "node:path";
import {
	benchmark,
	countQueries,
	type Metric,
	runMeasured,
	type ServedCms,
} from "#harness/performance";
import {
	createChat,
	queueMessage,
	sendMessage,
	waitForRun,
} from "#shared/agent";
import { callTool, reply, script } from "#shared/agent-script";
import { connectSession } from "#shared/ai";

/** How many runs each sample times for every metric. */
const RUNS = 10;
/** Exchanges in the long chat before it is timed, so each run loads that much history. */
const HISTORY = 40;

type Prepared = {
	server: ServedCms;
	/** A chat with `HISTORY` exchanges in it already. */
	longChat: string;
	destroy(): Promise<void>;
};

/** The middle value. */
const median = (values: number[]) =>
	values.toSorted((x, y) => x - y)[Math.floor((values.length - 1) / 2)] ?? 0;

/**
 * Times what the CMS adds to an agent run, with Lucid's model answering at once from the harness's
 * fake: a one-turn reply, a run with two tool turns, and a reply in a chat with a long history.
 * Query counts come from a run started without a stream, which only counts the whole run where the
 * queue runs it inline. Everything here is report-only.
 */
benchmark<Prepared>({
	id: "agent",
	prepare: async (context) => {
		const database = await context.database();
		try {
			await runMeasured({
				command: "lucidcms",
				args: ["migrate", "--yes"],
				cwd: context.setup.directory,
				env: { ...context.env, HARNESS_DATABASE_URL: database.url },
				log: path.join(context.work, "agent-migrate.log"),
			});
			const server = await context.serve(database);
			try {
				await connectSession(server.admin);
				const long = await createChat(server.admin);
				for (let exchange = 0; exchange < HISTORY; exchange++) {
					await sendMessage(
						server.admin,
						long.id,
						`Earlier message ${exchange} ${script(reply(`Earlier reply ${exchange}.`))}`,
					);
				}
				return { server, longChat: long.id, destroy: database.destroy };
			} catch (error) {
				await server.stop();
				throw error;
			}
		} catch (error) {
			await database.destroy();
			throw error;
		}
	},
	cleanup: async (prepared) => {
		await prepared.server.stop();
		await prepared.destroy();
	},
	sample: async (_context, prepared) => {
		const { admin } = prepared.server;
		const runs = {
			reply: () => script(reply("Done.")),
			tools: () =>
				script(
					callTool("harness_echo", { message: "one" }),
					callTool("harness_echo", { message: "two" }),
					reply("Done."),
				),
		};
		/** Times `RUNS` runs, each to the end of its stream, and counts one run's queries. */
		const measure = async (options: {
			key: string;
			label: string;
			text: () => string;
			chat: () => Promise<string>;
		}): Promise<Record<string, Metric>> => {
			const durations: number[] = [];
			for (let run = 0; run < RUNS; run++) {
				const chatId = await options.chat();
				const startedAt = performance.now();
				const stream = await sendMessage(admin, chatId, options.text());
				durations.push(performance.now() - startedAt);
				if (stream.finish !== "completed") {
					throw new Error(`${options.label} ended ${stream.finish}.`);
				}
			}
			const chatId = await options.chat();
			const queued = await queueMessage(admin, chatId, options.text());
			await waitForRun(admin, chatId, ["completed"]);

			return {
				[options.key]: {
					label: options.label,
					unit: "ms",
					value: Number(median(durations).toFixed(2)),
				},
				[`${options.key}.queries`]: {
					label: `${options.label} (database queries)`,
					unit: "count",
					value: countQueries(queued),
					blocking: false,
				},
			};
		};
		const newChat = async () => (await createChat(admin)).id;

		return {
			...(await measure({
				key: "reply",
				label: "Run a one-turn reply",
				text: runs.reply,
				chat: newChat,
			})),
			...(await measure({
				key: "tools",
				label: "Run two tool turns and a reply",
				text: runs.tools,
				chat: newChat,
			})),
			...(await measure({
				key: "reply.history",
				label: `Run a one-turn reply after ${HISTORY} exchanges`,
				text: runs.reply,
				chat: async () => prepared.longChat,
			})),
		};
	},
});

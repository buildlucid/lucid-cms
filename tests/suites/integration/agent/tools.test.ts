import { callTool, callTools, reply, script } from "#harness/client";
import { describe, expect, requires, test } from "#harness/vitest";
import {
	createChat,
	getMessages,
	pendingInteraction,
	respond,
	sendMessage,
	toolCallsOf,
} from "#shared/helpers/agent";
import {
	connectLucid,
	modelRequests,
	readEffects,
	uniqueTag,
} from "#shared/helpers/ai";

/** The tool result the model was sent for a call, from the request after it. */
const toolResult = async (
	lucid: Parameters<typeof modelRequests>[0],
	connection: string,
	chatId: string,
	name: string,
) => {
	const requests = await modelRequests(lucid, connection, chatId);
	const result = requests
		.flatMap((request) => request.messages)
		.findLast((message) => message.role === "tool" && message.name === name);
	return result?.output;
};

describe("agent tools", () => {
	requires("agent:harness");

	describe("confirmations", () => {
		test("waits for the person to confirm a write, then runs it once", async ({
			lucid,
		}) => {
			await connectLucid(lucid);
			const admin = await lucid.admin();
			const chat = await createChat(admin);
			const tag = uniqueTag("confirmed");

			const asked = await sendMessage(
				admin,
				chat.id,
				script(
					callTool("harness_write", { tag, value: "yes" }),
					reply("Saved."),
				),
			);
			expect(asked.finish).toBe("waiting");
			expect(await readEffects(lucid, tag)).toEqual([]);

			const { interaction, widget } = await pendingInteraction(admin, chat.id);
			expect(widget.key).toBe("lucid-tool-confirmation");
			const answered = await respond(admin, asked.runId ?? "", {
				interactionId: interaction.id,
			});
			expect(answered.finish).toBe("completed");
			expect(answered.text).toBe("Saved.");
			expect(
				(await readEffects(lucid, tag)).map((effect) => effect.value),
			).toEqual(["yes"]);
		});

		test("tells the model a refused write was denied, and never runs it", async ({
			lucid,
		}) => {
			const connection = await connectLucid(lucid);
			const admin = await lucid.admin();
			const chat = await createChat(admin);
			const tag = uniqueTag("refused");

			const asked = await sendMessage(
				admin,
				chat.id,
				script(
					callTool("harness_write", { tag }),
					reply("Understood, nothing saved."),
				),
			);
			const { interaction } = await pendingInteraction(admin, chat.id);
			const answered = await respond(admin, asked.runId ?? "", {
				interactionId: interaction.id,
				action: "cancel",
			});

			expect(answered.finish).toBe("completed");
			expect(await readEffects(lucid, tag)).toEqual([]);
			expect(
				await toolResult(lucid, connection, chat.id, "harness_write"),
			).toMatchObject({ error: expect.any(String) });
		});

		test("runs writes without asking in automatic mode", async ({ lucid }) => {
			await connectLucid(lucid);
			const admin = await lucid.admin();
			const chat = await createChat(admin, { confirmationMode: "automatic" });
			const tag = uniqueTag("automatic");

			const run = await sendMessage(
				admin,
				chat.id,
				script(callTool("harness_write", { tag }), reply("Saved.")),
			);
			expect(run.finish).toBe("completed");
			expect(await readEffects(lucid, tag)).toHaveLength(1);
		});

		test("asks once for every independent read in confirm-all mode, running only those picked", async ({
			lucid,
		}) => {
			const connection = await connectLucid(lucid);
			const admin = await lucid.admin();
			const chat = await createChat(admin, { confirmationMode: "confirm-all" });

			const asked = await sendMessage(
				admin,
				chat.id,
				script(
					callTools([
						{ name: "harness_echo", input: { message: "first" } },
						{ name: "harness_echo", input: { message: "second" } },
					]),
					reply("Done."),
				),
			);
			expect(asked.finish).toBe("waiting");
			const { interaction, widget } = await pendingInteraction(admin, chat.id);
			expect(widget.key).toBe("lucid-tool-confirmation-batch");
			expect(interaction.confirmations).toHaveLength(2);
			const [first] = interaction.confirmations ?? [];

			const answered = await respond(admin, asked.runId ?? "", {
				interactionId: interaction.id,
				response: { confirmedToolCallIds: [first?.toolCallId] },
			});
			expect(answered.finish).toBe("completed");

			const results = (await modelRequests(lucid, connection, chat.id))
				.at(-1)
				?.messages.filter((message) => message.role === "tool");
			expect(results?.map((result) => result.output)).toEqual([
				{ message: "first" },
				expect.objectContaining({ error: expect.any(String) }),
			]);
		});
	});

	describe("questions", () => {
		test("asks the person a question and gives the model their answer", async ({
			lucid,
		}) => {
			const connection = await connectLucid(lucid);
			const admin = await lucid.admin();
			const chat = await createChat(admin);

			const asked = await sendMessage(
				admin,
				chat.id,
				script(
					callTool("lucid_ask_user", { question: "Which colour?" }),
					reply("Blue it is."),
				),
			);
			expect(asked.finish).toBe("waiting");
			const { interaction, widget } = await pendingInteraction(admin, chat.id);
			expect(widget.key).toBe("lucid-question");

			const answered = await respond(admin, asked.runId ?? "", {
				interactionId: interaction.id,
				response: { answer: "Blue" },
			});
			expect(answered.finish).toBe("completed");
			expect(
				JSON.stringify(
					await toolResult(lucid, connection, chat.id, "lucid_ask_user"),
				),
			).toContain("Blue");
		});

		test("checks an answer against what the tool asked", async ({ lucid }) => {
			await connectLucid(lucid);
			const admin = await lucid.admin();
			const chat = await createChat(admin);

			const asked = await sendMessage(
				admin,
				chat.id,
				script(
					callTool("harness_choose", { options: ["red", "green"] }),
					reply("Chosen."),
				),
			);
			const { interaction } = await pendingInteraction(
				admin,
				chat.id,
				"harness-choice",
			);

			const wrong = await respond(admin, asked.runId ?? "", {
				interactionId: interaction.id,
				response: { choice: "purple" },
			});
			expect(wrong.status).toBe(400);
			expect((await pendingInteraction(admin, chat.id)).interaction.id).toBe(
				interaction.id,
			);

			const right = await respond(admin, asked.runId ?? "", {
				interactionId: interaction.id,
				response: { choice: "green" },
			});
			expect(right.finish).toBe("completed");
		});

		describe("with another person", () => {
			requires("harness:outbox");

			test("only lets the person the run acts for answer", async ({
				lucid,
			}) => {
				await connectLucid(lucid);
				const admin = await lucid.admin();
				const chat = await createChat(admin);
				const other = await lucid.user({ superAdmin: true });

				const asked = await sendMessage(
					admin,
					chat.id,
					script(
						callTool("lucid_ask_user", { question: "Sure?" }),
						reply("OK."),
					),
				);
				const { interaction } = await pendingInteraction(admin, chat.id);

				const answered = await respond(other.session, asked.runId ?? "", {
					interactionId: interaction.id,
					response: { answer: "Yes" },
				});
				expect(answered.status).toBe(404);
				expect(
					(await pendingInteraction(admin, chat.id)).interaction.status,
				).toBe("pending");
			});
		});
	});

	describe("failures", () => {
		test.for([{ how: "lucid" as const }, { how: "throw" as const }])(
			"tells the model when a tool fails ($how) and carries on",
			async ({ how }, { lucid }) => {
				const connection = await connectLucid(lucid);
				const admin = await lucid.admin();
				const chat = await createChat(admin);

				const run = await sendMessage(
					admin,
					chat.id,
					script(callTool("harness_fail", { how }), reply("It failed.")),
				);
				expect(run.finish).toBe("completed");
				expect(
					toolCallsOf(await getMessages(admin, chat.id)).map(
						(tool) => tool.status,
					),
				).toEqual(["failed"]);
				expect(
					await toolResult(lucid, connection, chat.id, "harness_fail"),
				).toMatchObject({ error: expect.any(String) });
			},
		);

		test("tells the model about a tool it doesn't have or input that doesn't fit", async ({
			lucid,
		}) => {
			const connection = await connectLucid(lucid);
			const admin = await lucid.admin();
			const chat = await createChat(admin);

			const run = await sendMessage(
				admin,
				chat.id,
				script(
					callTools([
						{ name: "harness_missing", input: {} },
						{ name: "harness_echo", input: { message: 42 } },
					]),
					reply("Sorry."),
				),
			);
			expect(run.finish).toBe("completed");
			const results = (await modelRequests(lucid, connection, chat.id))
				.at(-1)
				?.messages.filter((message) => message.role === "tool");
			expect(results).toHaveLength(2);
			for (const result of results ?? []) {
				expect(result.output).toMatchObject({ error: expect.any(String) });
			}
		});
	});

	test("runs independent reads together and returns every result in call order", async ({
		lucid,
	}) => {
		const connection = await connectLucid(lucid);
		const admin = await lucid.admin();
		const chat = await createChat(admin);
		const messages = ["one", "two", "three", "four"];

		const run = await sendMessage(
			admin,
			chat.id,
			script(
				callTools(
					messages.map((message) => ({
						name: "harness_echo",
						input: { message },
					})),
				),
				reply("All echoed."),
			),
		);
		expect(run.finish).toBe("completed");
		const results = (await modelRequests(lucid, connection, chat.id))
			.at(-1)
			?.messages.filter((message) => message.role === "tool");
		expect(results?.map((result) => result.output)).toEqual(
			messages.map((message) => ({ message })),
		);
	});
});

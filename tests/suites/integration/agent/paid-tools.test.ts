import { callTool, failGenerate, reply, script } from "#harness/client";
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
	chargedFor,
	connectLucid,
	generateRequests,
	modelRequests,
	usageSession,
} from "#shared/helpers/ai";

/** The output the model was sent for the last call of a tool. */
const resultOf = async (
	lucid: Parameters<typeof modelRequests>[0],
	connection: string,
	chatId: string,
	name: string,
) =>
	(await modelRequests(lucid, connection, chatId))
		.flatMap((request) => request.messages)
		.findLast((message) => message.role === "tool" && message.name === name)
		?.output;

describe("tools Lucid charges for", () => {
	requires("agent:harness");

	test("searches the web and reads a page, charging the chat for each", async ({
		lucid,
	}) => {
		const connection = await connectLucid(lucid);
		const admin = await lucid.admin();
		const chat = await createChat(admin);

		const run = await sendMessage(
			admin,
			chat.id,
			script(
				callTool("web_search", { query: "harness testing" }),
				//* only pages the chat has seen can be read, such as a search result
				callTool("web_read", {
					url: "https://example.com/harness/harness-testing-1",
				}),
				reply("Researched."),
			),
		);
		expect(run.finish).toBe("completed");
		expect(
			JSON.stringify(await resultOf(lucid, connection, chat.id, "web_search")),
		).toContain("Result 1 for harness testing");
		expect(
			JSON.stringify(await resultOf(lucid, connection, chat.id, "web_read")),
		).toContain(
			"Harness content of https://example.com/harness/harness-testing-1",
		);

		const searches = await generateRequests(lucid, connection, "web.search");
		expect(
			searches.filter((entry) => entry.sessionId === chat.id),
		).toHaveLength(1);
		const usage = await usageSession(admin, "agent", chat.id);
		expect(usage?.requests.webSearches).toBe(1);
		expect(usage?.requests.webFetches).toBe(1);
		expect(usage?.credits).toBe(await chargedFor(lucid, connection, chat.id));
	});

	test("tells the model when Lucid refuses a search, and carries on", async ({
		lucid,
	}) => {
		const connection = await connectLucid(lucid);
		const admin = await lucid.admin();
		const chat = await createChat(admin);

		const run = await sendMessage(
			admin,
			chat.id,
			script(
				callTool("web_search", {
					query: `refused ${failGenerate(503, "web_provider_unavailable")}`,
				}),
				reply("Search is down."),
			),
		);
		expect(run.finish).toBe("completed");
		expect(
			toolCallsOf(await getMessages(admin, chat.id)).map((tool) => tool.status),
		).toEqual(["failed"]);
		expect(
			await resultOf(lucid, connection, chat.id, "web_search"),
		).toMatchObject({ error: expect.any(String) });
	});

	describe("images", () => {
		requires("feature:mediaStorage");

		test("generates an image once the person checks its settings", async ({
			lucid,
		}) => {
			const connection = await connectLucid(lucid);
			const admin = await lucid.admin();
			const chat = await createChat(admin);

			const asked = await sendMessage(
				admin,
				chat.id,
				script(
					callTool("media_generate_image", {
						instruction: "A lighthouse at dawn",
						title: "Lighthouse",
					}),
					reply("Here it is."),
				),
			);
			expect(asked.finish).toBe("waiting");
			const { interaction, widget } = await pendingInteraction(admin, chat.id);
			expect(widget.key).toBe("lucid-image-settings");

			//* the widget sends back every setting it showed, with the person's changes
			const { editMediaId: _, ...settings } = widget.data;
			const answered = await respond(admin, asked.runId ?? "", {
				interactionId: interaction.id,
				response: {
					...settings,
					instruction: "A lighthouse at dawn, watercolour",
				},
			});
			expect(answered.finish).toBe("completed");
			const output = (await resultOf(
				lucid,
				connection,
				chat.id,
				"media_generate_image",
			)) as { mediaId?: number; media?: { id?: number } } | undefined;
			expect(JSON.stringify(output)).not.toContain('"error"');
			const [generated] = await generateRequests(
				lucid,
				connection,
				"media.image.generate",
			).then((entries) =>
				entries.filter((entry) => entry.sessionId === chat.id),
			);
			expect(JSON.stringify(generated?.request)).toContain("watercolour");
		});
	});
});

import { afterAll, assert, beforeAll, expect, test } from "vitest";
import { createTranslationStore } from "../../../libs/i18n/index.js";
import createServiceContext from "../../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import getTestConfig from "../../../utils/test-helpers/get-test-config.js";
import insertConversation from "../../agent/helpers/insert-conversation.js";
import registerUrlKeys from "../../agent/helpers/register-url-keys.js";
import isUrlInConversation from "./is-url-in-conversation.js";

const fixture = getTestConfig();
let context: ServiceContext;

beforeAll(async () => {
	await fixture.migrate();
	context = createServiceContext({
		config: await fixture.getConfig(),
		database: await fixture.getDatabase(),
		translationStore: createTranslationStore({
			defaultLocale: "en",
			bundles: {},
		}),
	});
});
afterAll(() => fixture.destroy());

const conversation = async () => {
	const result = await insertConversation(context, {
		agentKey: "url-provenance",
		userId: null,
	});
	assert(result.data, JSON.stringify(result.error));

	return result.data.id;
};

const isKnown = async (conversationId: string, url: string) =>
	(await isUrlInConversation(context, { conversationId, url })).data;

test("long URL keys stay bounded in the index and preserve exact query matching", async () => {
	const conversationId = await conversation();
	const url = `https://example.com/page?data=${"x".repeat(10_000)}`;

	await registerUrlKeys(context, {
		conversationId,
		role: "user",
		parts: [{ type: "text", text: url }],
	});

	expect(await isKnown(conversationId, url)).toBe(true);
	expect(await isKnown(conversationId, `${url}different`)).toBe(false);
	expect(await isKnown(await conversation(), url)).toBe(false);

	const indexed = await context.db.kysely
		.selectFrom("lucid_agent_url_keys")
		.select("url_key")
		.where("conversation_id", "=", conversationId)
		.executeTakeFirstOrThrow();
	expect(indexed.url_key).toHaveLength(64);
});

test("registration deduplicates keys and ignores assistant text", async () => {
	const conversationId = await conversation();
	const parts = [
		{
			type: "text" as const,
			text: "https://example.com/a https://example.com/a",
		},
	];

	await registerUrlKeys(context, { conversationId, role: "assistant", parts });
	expect(await isKnown(conversationId, "https://example.com/a")).toBe(false);

	for (let count = 0; count < 2; count++) {
		const registered = await registerUrlKeys(context, {
			conversationId,
			role: "user",
			parts,
		});
		expect(registered.error).toBeUndefined();
	}

	const rows = await context.db.kysely
		.selectFrom("lucid_agent_url_keys")
		.selectAll()
		.where("conversation_id", "=", conversationId)
		.execute();
	expect(rows).toHaveLength(1);
	expect(await isKnown(conversationId, "https://www.example.com/a/")).toBe(
		true,
	);
});

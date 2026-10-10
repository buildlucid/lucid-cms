import { randomUUID } from "node:crypto";
import { afterAll, assert, beforeAll, expect, test } from "vitest";
import { createTranslationStore } from "../../../libs/i18n/index.js";
import { Permissions } from "../../../libs/permission/definitions.js";
import { executeAgentTool } from "../../../libs/tools/execute-tool.js";
import { agentTools } from "../../../libs/tools/lucid-tools.js";
import type { AgentToolDefinition } from "../../../libs/tools/types.js";
import createServiceContext from "../../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import getTestConfig from "../../../utils/test-helpers/get-test-config.js";
import syncLocales from "../../sync/sync-locales.js";
import { outputSchema as findOutputSchema } from "./find/schema.js";
import { outputSchema as getOutputSchema } from "./get/schema.js";

const fixture = getTestConfig();
const hoursAgo = (hours: number) =>
	new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

let context: ServiceContext;
let admin: number;
let support: number;
let sent: number;
let failed: number;
let system: number;

beforeAll(async () => {
	const config = await fixture.getConfig();
	context = createServiceContext({
		config,
		database: await fixture.getDatabase(),
		translationStore: createTranslationStore({
			defaultLocale: "en",
			bundles: { en: { admin: {}, server: {} } },
		}),
	});
	await fixture.migrate();
	expect((await syncLocales(context)).error).toBeUndefined();

	admin = await insertUser({ super_admin: true });
	support = await insertUser({});
	sent = await insertEmail({
		to_address: "ada@example.test",
		created_at: hoursAgo(3),
	});
	failed = await insertEmail({
		to_address: "grace@example.test",
		current_status: "failed",
		attempt_count: 2,
		created_at: hoursAgo(2),
	});
	system = await insertEmail({
		to_address: "ops@example.test",
		is_system: 1,
		created_at: hoursAgo(1),
	});
	await context.db.kysely
		.insertInto("lucid_email_transactions")
		.values([
			{
				email_id: failed,
				delivery_status: "failed",
				message: "Mailbox full",
				strategy_identifier: "passthrough",
				strategy_data: null,
				external_message_id: null,
				simulate: 1,
				created_at: hoursAgo(2),
			},
			{
				email_id: failed,
				delivery_status: "failed",
				message: "Mailbox still full",
				strategy_identifier: "passthrough",
				strategy_data: null,
				external_message_id: null,
				simulate: 1,
				created_at: hoursAgo(1),
			},
		])
		.execute();
});
afterAll(() => fixture.destroy());

const insertUser = async (values: { super_admin?: boolean }) => {
	const user = await context.db.kysely
		.insertInto("lucid_users")
		.values({
			email: `${randomUUID()}@example.test`,
			username: randomUUID(),
			secret: "test",
			...values,
		})
		.returning("id")
		.executeTakeFirstOrThrow();
	return user.id;
};

const insertEmail = async (values: {
	to_address: string;
	current_status?: "sent" | "failed";
	attempt_count?: number;
	is_system?: 0 | 1;
	created_at?: string;
}) => {
	const email = await context.db.kysely
		.insertInto("lucid_emails")
		.values({
			//* the default local sender, which isn't a public email address
			from_address: "noreply@localhost",
			from_name: "Lucid",
			subject: "Welcome",
			template: "user-invite",
			priority: "normal",
			headers: null,
			data: { name: "Ada", inviteLink: "https://example.test/secret" },
			storage_strategy: { inviteLink: { redact: true } },
			type: "internal",
			is_system: 0,
			current_status: "sent",
			attempt_count: 1,
			//* inside the resend window, so emails_resend can send it again
			created_at: new Date().toISOString(),
			...values,
		})
		.returning("id")
		.executeTakeFirstOrThrow();
	return email.id;
};

/** Calls an agent tool for a person, with the run's permissions limited to the given ones. */
const callAgent = (
	userId: number,
	tool: AgentToolDefinition,
	input: unknown,
	permissions: string[] = [Permissions.EmailRead],
) => {
	const runId = randomUUID();
	return executeAgentTool({
		context,
		tool,
		input,
		execution: {
			authority: {
				principal: { type: "user", userId },
				permissions,
				superAdmin: false,
			},
			actor: { kind: "user", userId, agentRunId: runId },
			signal: AbortSignal.timeout(10_000),
			operationId: `${runId}:${randomUUID()}`,
			run: {
				id: runId,
				conversationId: randomUUID(),
				userId,
				agentKey: "test",
			},
		},
	});
};

const findAs = async (userId: number, input: unknown) => {
	const result = await callAgent(userId, agentTools.findEmails(), input);
	assert(result.type === "success", JSON.stringify(result));
	return findOutputSchema.parse(result.data.output).data;
};

test("finds emails newest first, by delivery status, and shows system emails to super admins only", async () => {
	const recent = await findAs(support, {});
	expect(recent.map((email) => email.id)).toEqual([failed, sent]);
	expect(recent[0]).toMatchObject({
		currentStatus: "failed",
		attemptCount: 2,
		mailDetails: {
			from: { address: "noreply@localhost" },
			to: "grace@example.test",
			template: "user-invite",
		},
	});
	expect(recent[0]).not.toHaveProperty("html");
	expect(recent[0]).not.toHaveProperty("data");

	expect(
		(
			await findAs(support, {
				query: { filter: [{ key: "currentStatus", value: ["failed"] }] },
			})
		).map((email) => email.id),
	).toEqual([failed]);
	expect((await findAs(admin, {})).map((email) => email.id)).toContain(system);

	expect(
		await callAgent(support, agentTools.findEmails(), {}, []),
	).toMatchObject({ type: "forbidden" });
});

test("reads one email with redacted data and its latest delivery attempts, rendering HTML only when asked", async () => {
	const result = await callAgent(support, agentTools.getEmail(), {
		emailId: failed,
	});
	assert(result.type === "success", JSON.stringify(result));
	const email = getOutputSchema.parse(result.data.output).data;

	expect(email).toMatchObject({
		id: failed,
		html: null,
		htmlTruncated: false,
		resendable: true,
		attachments: [],
	});
	expect(email.data).toMatchObject({ name: "Ada" });
	expect(email.data?.inviteLink).not.toBe("https://example.test/secret");
	expect(email.deliveries.map((delivery) => delivery.message)).toEqual([
		"Mailbox still full",
		"Mailbox full",
	]);
	expect(email.deliveries[0]).not.toHaveProperty("strategyData");

	expect(
		await callAgent(support, agentTools.getEmail(), { emailId: 999_999 }),
	).toMatchObject({ type: "failed" });
	//* system emails stay hidden from single reads too, so listings and reads agree
	expect(
		await callAgent(support, agentTools.getEmail(), { emailId: system }),
	).toMatchObject({ type: "failed" });
	expect(
		(await callAgent(admin, agentTools.getEmail(), { emailId: system })).type,
	).toBe("success");
});

test("resends a stored email after approval, but not one outside the resend window", async () => {
	const resend = agentTools.resendEmail();
	expect(resend.requiresApproval).toBe(true);

	const result = await callAgent(support, resend, { emailId: sent }, [
		Permissions.EmailSend,
	]);
	assert(result.type === "success", JSON.stringify(result));
	expect(result.data.output).toMatchObject({ job: { id: expect.any(String) } });
	const deliveries = await context.db.kysely
		.selectFrom("lucid_email_transactions")
		.select("id")
		.where("email_id", "=", sent)
		.execute();
	expect(deliveries).toHaveLength(1);

	const stale = await insertEmail({
		to_address: "old@example.test",
		created_at: "2020-01-01T00:00:00.000Z",
	});
	expect(
		await callAgent(support, resend, { emailId: stale }, [
			Permissions.EmailSend,
		]),
	).toMatchObject({ type: "failed" });
	expect(
		await callAgent(support, resend, { emailId: sent }, [
			Permissions.EmailRead,
		]),
	).toMatchObject({ type: "forbidden" });
	expect(
		await callAgent(support, resend, { emailId: system }, [
			Permissions.EmailSend,
		]),
	).toMatchObject({ type: "failed" });
});

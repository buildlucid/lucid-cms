import { afterAll, assert, beforeAll, expect, test } from "vitest";
import { createTranslationStore } from "../../../libs/i18n/index.js";
import createToolkit from "../../../libs/toolkit/create-toolkit.js";
import createServiceContext from "../../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import getTestConfig from "../../../utils/test-helpers/get-test-config.js";
import syncLocales from "../../sync/sync-locales.js";
import { sendEmailJob } from "./send-email.js";

const fixture = getTestConfig();

let context: ServiceContext;

beforeAll(async () => {
	const config = await fixture.getConfig();
	context = createServiceContext({
		//* the worker renders the template before it sends, so give it one
		config: {
			...config,
			email: {
				...config.email,
				templates: { "system-alert": "<p>{{name}}</p>" },
			},
		},
		database: await fixture.getDatabase(),
		translationStore: createTranslationStore({
			defaultLocale: "en",
			bundles: { en: { admin: {}, server: {} } },
		}),
	});
	await fixture.migrate();
	expect((await syncLocales(context)).error).toBeUndefined();
});
afterAll(() => fixture.destroy());

test("delivers system emails, which are hidden from people but not from the worker", async () => {
	const email = await context.db.kysely
		.insertInto("lucid_emails")
		.values({
			from_address: "noreply@example.test",
			from_name: "Lucid",
			to_address: "ops@example.test",
			subject: "Storage is nearly full",
			template: "system-alert",
			priority: "normal",
			headers: null,
			data: { name: "Ops" },
			storage_strategy: null,
			type: "internal",
			is_system: 1,
			current_status: "scheduled",
			attempt_count: 0,
			created_at: new Date().toISOString(),
		})
		.returning("id")
		.executeTakeFirstOrThrow();
	const transaction = await context.db.kysely
		.insertInto("lucid_email_transactions")
		.values({
			email_id: email.id,
			delivery_status: "scheduled",
			message: null,
			strategy_identifier: context.email.key,
			strategy_data: null,
			external_message_id: null,
			simulate: 1,
		})
		.returning("id")
		.executeTakeFirstOrThrow();

	//* the inline queue runs the job before enqueueing returns
	const enqueued = await createToolkit(context).jobs.enqueueJob({
		job: sendEmailJob,
		payload: { emailId: email.id, transactionId: transaction.id },
	});
	assert(enqueued.data, JSON.stringify(enqueued.error));

	const delivered = await context.db.kysely
		.selectFrom("lucid_emails")
		.select(["current_status", "attempt_count"])
		.where("id", "=", email.id)
		.executeTakeFirstOrThrow();
	expect(delivered).toEqual({ current_status: "sent", attempt_count: 1 });
});

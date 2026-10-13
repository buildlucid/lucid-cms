import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, expect, test } from "vitest";
import syncLocales from "../../../services/sync/sync-locales.js";
import createServiceContext from "../../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import getTestConfig from "../../../utils/test-helpers/get-test-config.js";
import { createTranslationStore } from "../../i18n/index.js";
import createToolkit from "../create-toolkit.js";

const fixture = getTestConfig();
let context: ServiceContext;

beforeAll(async () => {
	const config = await fixture.getConfig();
	context = createServiceContext({
		config: {
			...config,
			localization: {
				defaultLocale: "en",
				locales: [{ code: "en", label: "English" }],
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

const insertUser = async (superAdmin: boolean) => {
	const user = await context.db.kysely
		.insertInto("lucid_users")
		.values({
			email: `${randomUUID()}@example.test`,
			username: randomUUID(),
			secret: "test",
			super_admin: superAdmin,
		})
		.returning("id")
		.executeTakeFirstOrThrow();
	return user.id;
};

test("media writes check a user actor's permissions and record their agent run", async () => {
	const media = await context.db.kysely
		.insertInto("lucid_media")
		.values({
			key: randomUUID(),
			storage_adapter_key: "test",
			origin: "human",
			type: "image",
			mime_type: "image/png",
			file_extension: "png",
			file_name: "photo.png",
			file_size: 1,
		})
		.returning("id")
		.executeTakeFirstOrThrow();
	const runId = randomUUID();
	await context.db.kysely
		.insertInto("lucid_agent_attributions")
		.values({ run_id: runId, agent_key: "librarian", system: false })
		.execute();
	const toolkit = createToolkit(context);
	const title = [{ localeCode: "en", value: "Renamed" }];

	const denied = await toolkit.media.updateSingle({
		id: media.id,
		actor: { type: "user", userId: await insertUser(false) },
		title,
	});
	expect(denied.error?.status).toBe(403);

	const admin = await insertUser(true);
	const updated = await toolkit.media.updateSingle({
		id: media.id,
		actor: { type: "user", userId: admin, agentRunId: runId },
		title,
	});
	expect(updated.error).toBeUndefined();
	expect(
		await context.db.kysely
			.selectFrom("lucid_media")
			.select(["updated_by", "updated_by_run_id"])
			.where("id", "=", media.id)
			.executeTakeFirstOrThrow(),
	).toEqual({ updated_by: admin, updated_by_run_id: runId });
});

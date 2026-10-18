import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, expect, test, vi } from "vitest";
import syncLocales from "../../../services/sync/sync-locales.js";
import createServiceContext from "../../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import getTestConfig from "../../../utils/test-helpers/get-test-config.js";
import { createTranslationStore } from "../../i18n/index.js";
import {
	invalidateHttpCacheTag,
	invalidateHttpCacheTags,
} from "../../kv/http-cache.js";
import createToolkit from "../create-toolkit.js";

vi.mock(import("../../kv/http-cache.js"), async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		invalidateHttpCacheTag: vi.fn(actual.invalidateHttpCacheTag),
		invalidateHttpCacheTags: vi.fn(actual.invalidateHttpCacheTags),
	};
});

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

const insertMedia = (ownerUserId: number | null = null) =>
	context.db.kysely
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
			owner_user_id: ownerUserId,
		})
		.returning("id")
		.executeTakeFirstOrThrow();

test("media writes check a user actor's permissions and record their agent run", async () => {
	const media = await insertMedia();
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

test("libraryOnly reads leave out personal media, as the content API does", async () => {
	const library = await insertMedia();
	const personal = await insertMedia(await insertUser(false));
	const toolkit = createToolkit(context);

	expect(
		(await toolkit.media.getSingle({ id: personal.id })).error,
	).toBeUndefined();
	expect(
		(await toolkit.media.getSingle({ id: personal.id, libraryOnly: true }))
			.error?.status,
	).toBe(404);

	const listed = await toolkit.media.getMultiple({
		query: { filter: { id: { value: [library.id, personal.id] } } },
		libraryOnly: true,
	});
	expect(listed.data?.data.map((item) => item.id)).toEqual([library.id]);
});

test("notifyChange clears the content API's media caches after direct writes", async () => {
	const media = await insertMedia();
	const toolkit = createToolkit(context);

	expect(
		(await toolkit.media.notifyChange({ ids: [media.id] })).error,
	).toBeUndefined();
	expect(invalidateHttpCacheTag).toHaveBeenCalledWith(
		context,
		`content-media:${media.id}`,
	);
	expect(invalidateHttpCacheTags).toHaveBeenCalledWith(context, [
		"content-media",
	]);
});

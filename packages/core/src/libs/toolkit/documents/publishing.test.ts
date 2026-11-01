import { randomUUID } from "node:crypto";
import { afterAll, assert, beforeAll, expect, test } from "vitest";
import syncCollections from "../../../services/sync/sync-collections.js";
import syncLocales from "../../../services/sync/sync-locales.js";
import createServiceContext from "../../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import getTestConfig from "../../../utils/test-helpers/get-test-config.js";
import applyCollectionMigrations from "../../collection/apply-collection-migrations.js";
import CollectionBuilder from "../../collection/builders/collection-builder/index.js";
import planCollectionMigrations from "../../collection/plan-collection-migrations.js";
import { getTableNames } from "../../collection/schema/runtime/runtime-schema-selectors.js";
import { createTranslationStore } from "../../i18n/index.js";
import createToolkit from "../create-toolkit.js";

const collection = new CollectionBuilder("toolkit_publishing", {
	mode: "multiple",
	details: { labels: { singular: "Article", plural: "Articles" } },
	publishing: {
		review: { publish: ["production"] },
		environments: [
			{ key: "staging", label: "Staging" },
			{ key: "production", label: "Production" },
		],
	},
}).addText("title");

const fixture = getTestConfig();
let context: ServiceContext;

beforeAll(async () => {
	const config = await fixture.getConfig();
	context = createServiceContext({
		config: { ...config, collections: [collection] },
		database: await fixture.getDatabase(),
		translationStore: createTranslationStore({
			defaultLocale: "en",
			bundles: { en: { admin: {}, server: {} } },
		}),
	});
	await fixture.migrate();
	expect((await syncLocales(context)).error).toBeUndefined();
	expect((await syncCollections(context)).error).toBeUndefined();
	const plan = await planCollectionMigrations(context);
	assert(plan.data, JSON.stringify(plan.error));
	expect(
		(await applyCollectionMigrations(context, plan.data)).error,
	).toBeUndefined();
});
afterAll(() => fixture.destroy());

test("publishes and unpublishes directly only where review isn't required", async () => {
	const toolkit = createToolkit(context);
	const created = await toolkit.documents.createSingle({
		collectionKey: collection.key,
		actor: { type: "system" },
		data: { fields: { title: "Launch" } },
	});
	assert(created.data, JSON.stringify(created.error));
	const document = { collectionKey: collection.key, id: created.data.id };
	const readStaging = () =>
		toolkit.documents.getSingle({
			collectionKey: collection.key,
			version: "staging",
			query: { filter: { id: { value: document.id } } },
		});

	const user = await context.db.kysely
		.insertInto("lucid_users")
		.values({
			email: `${randomUUID()}@example.test`,
			username: randomUUID(),
			secret: "test",
		})
		.returning("id")
		.executeTakeFirstOrThrow();
	const denied = await toolkit.documents.publish({
		...document,
		actor: { type: "user", userId: user.id },
		environment: "staging",
	});
	expect(denied.error?.status).toBe(403);
	const reviewed = await toolkit.documents.publish({
		...document,
		actor: { type: "system" },
		environment: "production",
	});
	expect(reviewed.error?.status).toBe(403);

	const runId = randomUUID();
	await context.db.kysely
		.insertInto("lucid_agent_attributions")
		.values({ run_id: runId, agent_key: "publisher", system: true })
		.execute();
	const published = await toolkit.documents.publish({
		...document,
		actor: { type: "system", agentRunId: runId },
		environment: "staging",
	});
	expect(published.error).toBeUndefined();
	expect((await readStaging()).data?.id).toBe(document.id);
	const tables = await getTableNames(context, collection.key);
	assert(tables.data, JSON.stringify(tables.error));
	expect(
		await context.db.kysely
			.selectFrom(tables.data.version)
			.select(["created_by", "created_by_run_id"])
			.where("document_id", "=", document.id)
			.where("type", "=", "staging")
			.executeTakeFirstOrThrow(),
	).toEqual({ created_by: null, created_by_run_id: runId });

	const unpublished = await toolkit.documents.unpublish({
		...document,
		actor: { type: "system" },
		environment: "staging",
	});
	expect(unpublished.error).toBeUndefined();
	expect((await readStaging()).error?.status).toBe(404);
});

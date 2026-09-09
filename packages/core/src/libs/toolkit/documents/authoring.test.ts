import {
	afterAll,
	assert,
	beforeAll,
	describe,
	expect,
	test,
	vi,
} from "vitest";
import deleteMultiple from "../../../services/documents/delete-multiple.js";
import acquireDocumentWrites from "../../../services/documents/helpers/acquire-document-writes.js";
import readDocumentContent from "../../../services/documents/helpers/read-document-content.js";
import restoreMultiple from "../../../services/documents/restore-multiple.js";
import upsertSingle from "../../../services/documents/upsert-single.js";
import updateVersion from "../../../services/documents-versions/update-single.js";
import syncCollections from "../../../services/sync/sync-collections.js";
import syncLocales from "../../../services/sync/sync-locales.js";
import createServiceContext from "../../../utils/services/create-service-context.js";
import serviceWrapper from "../../../utils/services/service-wrapper.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import getTestConfig from "../../../utils/test-helpers/get-test-config.js";
import applyCollectionMigrations from "../../collection/apply-collection-migrations.js";
import BrickBuilder from "../../collection/builders/brick-builder/index.js";
import CollectionBuilder from "../../collection/builders/collection-builder/index.js";
import planCollectionMigrations from "../../collection/plan-collection-migrations.js";
import { getTableNames } from "../../collection/schema/runtime/runtime-schema-selectors.js";
import { copy, createTranslationStore } from "../../i18n/index.js";
import { UsersRepository } from "../../repositories/index.js";
import createToolkit from "../create-toolkit.js";

const hero = new BrickBuilder("hero").addText("heading", { localized: true });
const collection = new CollectionBuilder("authoring", {
	mode: "multiple",
	localized: true,
	revisions: true,
	details: { labels: { singular: "Article", plural: "Articles" } },
	bricks: {
		builder: [hero],
		fixed: [
			new BrickBuilder("seo")
				.addText("description", { localized: false })
				.addText("summary", { localized: false }),
		],
		embedded: [
			new BrickBuilder("callout").addText("message", { localized: false }),
		],
	},
})
	.addText("title", { localized: true, validation: { required: true } })
	.addCheckbox("featured", { default: false })
	.addJSON("settings", { localized: false })
	.addRichText("body", { localized: false, editor: { bricks: true } })
	.addSection("meta")
	.addText("subtitle", { localized: false })
	.endSection()
	.addRepeater("links")
	.addText("label", { localized: false })
	.addRepeater("children")
	.addText("caption", { localized: false })
	.endRepeater()
	.endRepeater()
	.addRelation("related", {
		collection: "authoring",
		multiple: true,
		localized: false,
	});

describe("document authoring toolkit", () => {
	const fixture = getTestConfig();
	let context: ServiceContext;
	let toolkit: ReturnType<typeof createToolkit>;
	const actor = { kind: "system" } as const;
	const create = (title = "Hello") =>
		toolkit.documents.createSingle({
			collectionKey: collection.key,
			actor,
			data: {
				fields: {
					title: { en: title, fr: "Bonjour" },
					settings: { nested: { value: 1 } },
					links: [
						{
							fields: {
								label: "First",
								children: [{ fields: { caption: "Nested" } }],
							},
						},
						{ fields: { label: "Second" } },
					],
				},
				bricks: {
					builder: [
						{
							key: "hero",
							fields: { heading: { en: "Heading", fr: "Titre" } },
						},
					],
				},
			},
		});
	beforeAll(async () => {
		const config = await fixture.getConfig();
		context = createServiceContext({
			config: {
				...config,
				collections: [collection],
				localization: {
					defaultLocale: "en",
					locales: [
						{ code: "en", label: "English" },
						{ code: "fr", label: "French" },
					],
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
		expect((await syncCollections(context)).error).toBeUndefined();
		const plan = await planCollectionMigrations(context);
		assert(plan.data, JSON.stringify(plan.error));
		expect(
			(await applyCollectionMigrations(context, plan.data)).error,
		).toBeUndefined();
		toolkit = createToolkit(context);
	});
	afterAll(() => fixture.destroy());

	test("creates userless documents, applies defaults, and exposes the physical schema", async () => {
		const created = await create();
		assert(created.data, JSON.stringify(created.error));
		const editable = await toolkit.documents.getEditable({
			collectionKey: collection.key,
			id: created.data.id,
		});
		assert(editable.data, JSON.stringify(editable.error));
		expect(editable.data.editToken).toBe(created.data.editToken);
		expect(editable.data.data.fields).toMatchObject({
			title: { en: "Hello", fr: "Bonjour" },
			featured: false,
		});
		const tables = await getTableNames(context, collection.key);
		assert(tables.data);
		const row = await context.db.kysely
			.selectFrom(tables.data.document)
			.selectAll()
			.where("id", "=", created.data.id)
			.executeTakeFirstOrThrow();
		expect(row.created_by).toBeNull();
		expect(row.updated_by).toBeNull();
		const schema = await toolkit.collections.getSchema({
			collectionKey: collection.key,
		});
		assert(schema.data, JSON.stringify(schema.error));
		expect(schema.data.requiresMigration).toBe(false);
		expect(
			schema.data.tables.some((table) => table.name === tables.data.document),
		).toBe(true);
		expect(
			schema.data.tables.some((table) =>
				table.columns.some((column) => column.name === "group_instance_id"),
			),
		).toBe(true);
	});

	test("includes each document's bricks in batch reads only when requested", async () => {
		const first = await create("First batch document");
		const second = await create("Second batch document");
		assert(first.data && second.data);
		const ids = [first.data.id, second.data.id];
		const filter = { id: { value: ids, operator: "in" as const } };
		const defaults = await toolkit.documents.getMultiple({
			collectionKey: collection.key,
			version: "latest",
			query: { filter },
		});
		assert(defaults.data, JSON.stringify(defaults.error));
		expect(defaults.data.count).toBe(2);
		for (const document of defaults.data.documents) {
			expect(document.bricks).toBeUndefined();
		}

		const included = await toolkit.documents.getMultiple({
			collectionKey: collection.key,
			version: "latest",
			query: { filter, include: ["bricks"] },
		});
		assert(included.data, JSON.stringify(included.error));
		expect(included.data.count).toBe(2);
		for (const document of included.data.documents) {
			const single = await toolkit.documents.getSingle({
				collectionKey: collection.key,
				version: "latest",
				query: {
					filter: { id: { value: document.id } },
					include: ["bricks"],
				},
			});
			assert(single.data, JSON.stringify(single.error));
			expect(document.bricks).toEqual(single.data.document.bricks);
			expect(document.bricks).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						key: "hero",
						fields: { heading: { en: "Heading", fr: "Titre" } },
					}),
				]),
			);
		}
	});

	test("runs restore hooks with a toolkit that can read the restored document", async () => {
		const created = await create("Restored document");
		assert(created.data);
		const target = { collectionKey: collection.key, id: created.data.id };
		expect(
			(await toolkit.documents.deleteSingle({ ...target, actor })).error,
		).toBeUndefined();
		const hooks = context.config.hooks;
		const restored = vi.fn();
		context.config.hooks = [
			...hooks,
			{
				service: "documents",
				event: "afterRestore",
				handler: async ({ context, toolkit, meta, data }) => {
					expect(context.db.isTransaction).toBe(true);
					expect(meta.collectionKey).toBe(collection.key);
					expect(data.ids).toEqual([target.id]);
					const read = await toolkit.documents.getEditable(target);
					assert(read.data, JSON.stringify(read.error));
					restored(read.data.id);
					return { error: undefined, data: undefined };
				},
			},
		];
		try {
			const result = await serviceWrapper(restoreMultiple, {
				transaction: true,
			})(context, { collectionKey: collection.key, ids: [target.id] });
			expect(result.error).toBeUndefined();
			expect(restored).toHaveBeenCalledExactlyOnceWith(target.id);
		} finally {
			context.config.hooks = hooks;
		}
	});

	test("merges locales, preserves nested identities, rejects stale tokens and avoids empty revisions", async () => {
		const created = await create();
		assert(created.data, JSON.stringify(created.error));
		const target = { collectionKey: collection.key, id: created.data.id };
		const original = await toolkit.documents.getEditable(target);
		assert(original.data);
		const updated = await toolkit.documents.updateSingle({
			...target,
			actor,
			ifUnchanged: original.data.editToken,
			data: { fields: { title: { en: "Changed" } } },
		});
		assert(updated.data, JSON.stringify(updated.error));
		expect(updated.data.version.id).not.toBe(created.data.version.id);
		const after = await toolkit.documents.getEditable(target);
		assert(after.data);
		expect(after.data.data.fields).toMatchObject({
			title: { en: "Changed", fr: "Bonjour" },
			links: original.data.data.fields?.links,
		});
		expect(after.data.data.bricks).toEqual(original.data.data.bricks);
		const stale = await toolkit.documents.updateSingle({
			...target,
			actor,
			ifUnchanged: original.data.editToken,
			data: { fields: { featured: true } },
		});
		expect(stale.error?.status).toBe(409);
		const noop = await toolkit.documents.updateSingle({
			...target,
			actor,
			data: { fields: { title: { en: "Changed" }, featured: undefined } },
		});
		expect(noop.data).toMatchObject({
			changed: false,
			editToken: updated.data.editToken,
		});
	});

	test("patches and moves nested items by ref, replaces JSON and validates the final result atomically", async () => {
		const created = await create();
		assert(created.data, JSON.stringify(created.error));
		const target = { collectionKey: collection.key, id: created.data.id };
		const stored = await readDocumentContent(context, target);
		assert(stored.data);
		const first = stored.data.stored.fields.find(
			(field) => field.key === "links",
		)?.groups?.[0];
		const second = stored.data.stored.fields.find(
			(field) => field.key === "links",
		)?.groups?.[1];
		assert(first && second);
		const patched = await toolkit.documents.patchSingle({
			...target,
			actor,
			operations: [
				{
					op: "set",
					path: ["fields", "links", { ref: first.ref }, "fields", "label"],
					value: "Edited",
				},
				{
					op: "move",
					path: ["fields", "links", { ref: second.ref }],
					before: first.ref,
				},
				{
					op: "insert",
					path: ["fields", "links"],
					value: { fields: { label: "Third" } },
				},
				{
					op: "set",
					path: ["fields", "settings"],
					value: { replacement: true },
				},
			],
		});
		assert(patched.data, JSON.stringify(patched.error));
		const after = await readDocumentContent(context, target);
		assert(after.data);
		expect(after.data.data.fields.settings).toEqual({ replacement: true });
		const links = after.data.stored.fields.find(
			(field) => field.key === "links",
		)?.groups;
		expect(links?.map((item) => item.ref).slice(0, 2)).toEqual([
			second.ref,
			first.ref,
		]);
		expect(
			links?.[1]?.fields.find((field) => field.key === "label")?.value,
		).toBe("Edited");
		const rejected = await toolkit.documents.patchSingle({
			...target,
			actor,
			operations: [
				{ op: "set", path: ["fields", "featured"], value: true },
				{ op: "set", path: ["fields", "title", "en"], value: null },
			],
		});
		expect(rejected.error).toBeDefined();
		const unchanged = await toolkit.documents.getEditable(target);
		expect(unchanged.data?.editToken).toBe(patched.data.editToken);
		expect(unchanged.data?.data.fields?.featured).toBe(false);
		const invalidPath = await toolkit.documents.patchSingle({
			...target,
			actor,
			operations: [
				{
					op: "set",
					path: ["fields", "settings", "replacement"],
					value: false,
				},
			],
		});
		expect(invalidPath.error?.status).toBe(400);
	});

	test("translates document errors with interpolation and locale overrides", async () => {
		const created = await create();
		assert(created.data);
		const result = await toolkit.documents.patchSingle({
			collectionKey: collection.key,
			id: created.data.id,
			actor,
			operations: [
				{ op: "remove", path: ["fields", "links", { ref: "missing-link" }] },
			],
		});
		assert(result.error?.message);
		expect(context.translate(result.error.message)).toBe(
			"No item has ref missing-link.",
		);

		const store = createTranslationStore({
			defaultLocale: "en",
			bundles: {
				fr: {
					admin: {},
					server: {
						"core.documents.authoring.item.not.found":
							"Aucun élément ne porte la référence {{ref}}.",
					},
				},
			},
		});
		expect(store.copy(result.error.message, { locale: "fr" })).toBe(
			"Aucun élément ne porte la référence missing-link.",
		);

		const unknown = await toolkit.documents.updateSingle({
			collectionKey: collection.key,
			id: created.data.id,
			actor,
			data: { fields: { missingField: true } },
		});
		assert(unknown.error?.message);
		expect(context.translate(unknown.error.message)).toBe(
			"Unknown field or locale: document.fields.missingField.",
		);
	});

	test("uses live user permissions and detects an intervening admin save", async () => {
		const Users = new UsersRepository(context.db);
		const user = await Users.createSingle({
			data: {
				email: "writer@example.com",
				username: "writer",
				secret: "test",
				super_admin: false,
			},
			returning: ["id"],
			validation: { enabled: true },
		});
		assert(user.data);
		const created = await create();
		assert(created.data, JSON.stringify(created.error));
		const target = { collectionKey: collection.key, id: created.data.id };
		const denied = await toolkit.documents.updateSingle({
			...target,
			actor: { kind: "user", userId: user.data.id },
			data: { fields: { featured: true } },
		});
		expect(denied.error?.status).toBe(403);
		const stored = await readDocumentContent(context, target);
		assert(stored.data);
		const saved = await updateVersion(context, {
			collectionKey: collection.key,
			documentId: target.id,
			versionId: stored.data.version.id,
			userId: user.data.id,
			...stored.data.stored,
		});
		assert(saved.data, JSON.stringify(saved.error));
		const stale = await toolkit.documents.updateSingle({
			...target,
			actor,
			ifUnchanged: created.data.editToken,
			data: { fields: { featured: true } },
		});
		expect(stale.error?.status).toBe(409);
	});

	test("connects and disconnects relations, supports both delete modes and reports batch failures", async () => {
		const first = await create("First");
		const second = await create("Second");
		assert(
			first.data && second.data,
			JSON.stringify(first.error ?? second.error),
		);
		const target = { collectionKey: collection.key, id: first.data.id };
		const relation = { collectionKey: collection.key, id: second.data.id };
		const connected = await toolkit.documents.patchSingle({
			...target,
			actor,
			operations: [
				{
					op: "connect",
					path: ["fields", "related"],
					values: [relation, relation],
				},
			],
		});
		assert(connected.data, JSON.stringify(connected.error));
		const read = await toolkit.documents.getEditable(target);
		expect(read.data?.data.fields?.related).toEqual([relation]);
		const disconnected = await toolkit.documents.patchSingle({
			...target,
			actor,
			operations: [
				{ op: "disconnect", path: ["fields", "related"], values: [relation] },
			],
		});
		assert(disconnected.data, JSON.stringify(disconnected.error));
		const deleted = await toolkit.documents.deleteSingle({ ...target, actor });
		expect(deleted.error).toBeUndefined();
		expect((await toolkit.documents.getEditable(target)).error?.status).toBe(
			404,
		);
		const hard = await toolkit.documents.deleteSingle({
			...target,
			actor,
			hard: true,
		});
		expect(hard.error).toBeUndefined();
		const batch = await toolkit.documents.deleteMultiple({
			collectionKey: collection.key,
			actor,
			ids: [second.data.id, 999999, second.data.id],
			hard: true,
		});
		expect(batch.data).toMatchObject([
			{ id: second.data.id, status: "deleted" },
			{ id: 999999, status: "failed" },
		]);
	});

	test("continues batch deletion after a throwing hook and rolls back only the failed document", async () => {
		const first = await create("Retained");
		const second = await create("Deleted");
		assert(first.data && second.data);
		const firstId = first.data.id;
		const secondId = second.data.id;
		const hooks = context.config.hooks;
		context.config.hooks = [
			...hooks,
			{
				service: "documents",
				event: "afterDelete",
				handler: async ({ data }) => {
					if (data.ids.includes(firstId))
						throw new Error("Unexpected deletion hook failure.");

					return { error: undefined, data: undefined };
				},
			},
		];
		try {
			const result = await serviceWrapper(
				async (context) =>
					createToolkit(context).documents.deleteMultiple({
						collectionKey: collection.key,
						ids: [firstId, secondId],
						actor,
						hard: true,
					}),
				{ transaction: true },
			)(context);
			expect(result.data).toMatchObject([
				{ id: firstId, status: "failed", error: { status: 500 } },
				{ id: secondId, status: "deleted" },
			]);
		} finally {
			context.config.hooks = hooks;
		}

		expect(
			(
				await toolkit.documents.getEditable({
					collectionKey: collection.key,
					id: firstId,
				})
			).data?.editToken,
		).toBe(first.data.editToken);
		expect(
			(
				await toolkit.documents.getEditable({
					collectionKey: collection.key,
					id: secondId,
				})
			).error?.status,
		).toBe(404);
	});

	test.each([
		"returned",
		"thrown",
	])("isolates a %s hook failure inside an existing transaction", async (failure) => {
		const created = await create();
		assert(created.data);
		const target = { collectionKey: collection.key, id: created.data.id };
		const hooks = context.config.hooks;
		context.config.hooks = [
			...hooks,
			{
				service: "documents",
				event: "afterUpsert",
				handler: async () => {
					if (failure === "thrown") throw new Error("Unexpected hook failure.");

					return {
						error: {
							status: 400,
							message: copy("server:core.errors.default.message"),
						},
						data: undefined,
					};
				},
			},
		];
		try {
			const outer = await serviceWrapper(
				async (context) => {
					const toolkit = createToolkit(context);
					const failed = await toolkit.documents.updateSingle({
						...target,
						actor,
						data: { fields: { featured: true } },
					});
					expect(failed.error).toBeDefined();
					if (failure === "thrown") {
						expect(context.translate(failed.error?.message)).toBe(
							"Lucid toolkit could not update the document.",
						);
					}

					// The caller deliberately handles the error and commits its own transaction.
					return { error: undefined, data: undefined };
				},
				{ transaction: true },
			)(context);
			expect(outer.error).toBeUndefined();
		} finally {
			context.config.hooks = hooks;
		}
		const read = await toolkit.documents.getEditable(target);
		expect(read.data?.editToken).toBe(created.data.editToken);
		expect(read.data?.data.fields?.featured).toBe(false);
	});

	test("round-trips fixed, structural and embedded content without running display hooks", async () => {
		const created = await create();
		assert(created.data);
		const target = { collectionKey: collection.key, id: created.data.id };
		const body = {
			type: "doc",
			content: [{ type: "lucidEmbeddedBrick", attrs: { ref: "callout-1" } }],
		};
		const hooks = context.config.hooks;
		context.config.hooks = [
			...hooks,
			{
				service: "documents",
				event: "afterFetch",
				handler: async () => {
					throw new Error("Display hook must not run for editable reads.");
				},
			},
		];
		try {
			const written = await toolkit.documents.updateSingle({
				...target,
				actor,
				data: {
					fields: { body, meta: { subtitle: "Subtitle" } },
					bricks: {
						fixed: { seo: { description: "Description", summary: "Summary" } },
						embedded: [
							{
								key: "callout",
								ref: "callout-1",
								fields: { message: "Notice" },
							},
						],
					},
				},
			});
			assert(written.data, JSON.stringify(written.error));
			const patch = await toolkit.documents.patchSingle({
				...target,
				actor,
				operations: [
					{
						op: "set",
						path: ["bricks", "fixed", "seo", "description"],
						value: "New description",
					},
					{
						op: "set",
						path: [
							"bricks",
							"embedded",
							{ ref: "callout-1", key: "callout" },
							"fields",
							"message",
						],
						value: "New notice",
					},
				],
			});
			assert(patch.data, JSON.stringify(patch.error));
			const editable = await toolkit.documents.getEditable(target);
			assert(editable.data, JSON.stringify(editable.error));
			expect(editable.data.data.fields).toMatchObject({
				body,
				meta: { subtitle: "Subtitle" },
			});
			expect(editable.data.data.bricks.fixed.seo).toEqual({
				description: "New description",
				summary: "Summary",
			});
			expect(editable.data.data.bricks.embedded).toEqual([
				{ key: "callout", ref: "callout-1", fields: { message: "New notice" } },
			]);
			for (const data of [
				{ fields: { unknown: true } },
				{ fields: { title: { de: "Invalid" } } },
				{ bricks: { builder: [{ key: "unknown", fields: {} }] } },
			]) {
				expect(
					(await toolkit.documents.updateSingle({ ...target, actor, data }))
						.error?.status,
				).toBe(400);
			}
		} finally {
			context.config.hooks = hooks;
		}
	});

	test("preserves the original user creator when a system updates a document", async () => {
		const Users = new UsersRepository(context.db);
		const user = await Users.createSingle({
			data: {
				email: "admin-writer@example.com",
				username: "admin_writer",
				secret: "test",
				super_admin: true,
			},
			returning: ["id"],
			validation: { enabled: true },
		});
		assert(user.data);
		const created = await toolkit.documents.createSingle({
			collectionKey: collection.key,
			actor: { kind: "user", userId: user.data.id },
			data: { fields: { title: { en: "Hello", fr: "Bonjour" } } },
		});
		assert(created.data, JSON.stringify(created.error));
		const updated = await toolkit.documents.updateSingle({
			collectionKey: collection.key,
			id: created.data.id,
			actor,
			data: { fields: { featured: true } },
		});
		assert(updated.data, JSON.stringify(updated.error));
		const tables = await getTableNames(context, collection.key);
		assert(tables.data);
		const document = await context.db.kysely
			.selectFrom(tables.data.document)
			.select(["created_by", "updated_by"])
			.where("id", "=", created.data.id)
			.executeTakeFirstOrThrow();
		expect(document).toEqual({ created_by: user.data.id, updated_by: null });
		const revision = await context.db.kysely
			.selectFrom(tables.data.version)
			.select(["created_by", "type"])
			.where("id", "=", created.data.version.id)
			.executeTakeFirstOrThrow();
		expect(revision).toEqual({ created_by: user.data.id, type: "revision" });
	});

	test.each([
		"admin",
		"toolkit",
	])("holds %s write claims without transactions and releases them after failure", async (source) => {
		const created = await create();
		assert(created.data);
		const target = { collectionKey: collection.key, id: created.data.id };
		const content = await readDocumentContent(context, target);
		assert(content.data);
		const supports = context.config.db.supports.bind(context.config.db);
		const capability = vi
			.spyOn(context.config.db, "supports")
			.mockImplementation((feature) =>
				feature === "transaction" ? false : supports(feature),
			);
		const hooks = context.config.hooks;
		const entered = Promise.withResolvers<void>();
		const resume = Promise.withResolvers<void>();
		context.config.hooks = [
			...hooks,
			{
				service: "documents",
				event: "beforeUpsert",
				handler: async () => {
					entered.resolve();
					await resume.promise;
					return {
						error: {
							status: 400,
							message: copy("server:core.errors.default.message"),
						},
						data: undefined,
					};
				},
			},
		];
		try {
			const writing =
				source === "admin"
					? upsertSingle(context, {
							collectionKey: collection.key,
							documentId: target.id,
							userId: null,
							...content.data.stored,
						})
					: toolkit.documents.updateSingle({
							...target,
							actor,
							data: { fields: { featured: true } },
						});
			await entered.promise;
			const sameToolkit = await toolkit.documents.updateSingle({
				...target,
				actor,
				data: { fields: { featured: true } },
			});
			expect(sameToolkit.error?.status).toBe(409);
			const other = createToolkit({ ...context });
			const conflict = await other.documents.updateSingle({
				...target,
				actor,
				data: { fields: { title: { en: "Concurrent" } } },
			});
			expect(conflict.error?.status).toBe(409);
			expect((await other.documents.getEditable(target)).error?.status).toBe(
				409,
			);
			resume.resolve();
			expect((await writing).error).toBeDefined();
			const read = await other.documents.getEditable(target);
			expect(read.data?.editToken).toBe(created.data.editToken);
			expect(read.data?.data.fields?.featured).toBe(false);
		} finally {
			resume.resolve();
			context.config.hooks = hooks;
			capability.mockRestore();
		}
		const updated = await toolkit.documents.updateSingle({
			...target,
			actor,
			data: { fields: { featured: true } },
		});
		expect(updated.error).toBeUndefined();
	});

	test("rejects a same-document write from a hook without disrupting the outer save", async () => {
		const created = await create();
		assert(created.data);
		const target = { collectionKey: collection.key, id: created.data.id };
		const hooks = context.config.hooks;
		context.config.hooks = [
			...hooks,
			{
				service: "documents",
				event: "beforeUpsert",
				handler: async ({ toolkit }) => {
					const nested = await toolkit.documents.updateSingle({
						...target,
						actor,
						data: { fields: { title: { en: "Nested" } } },
					});
					expect(nested.error?.status).toBe(409);
					return { error: undefined, data: undefined };
				},
			},
		];
		try {
			const updated = await toolkit.documents.updateSingle({
				...target,
				actor,
				data: { fields: { featured: true } },
			});
			assert(updated.data, JSON.stringify(updated.error));
			const read = await toolkit.documents.getEditable(target);
			expect(read.data?.data.fields).toMatchObject({
				title: { en: "Hello" },
				featured: true,
			});
		} finally {
			context.config.hooks = hooks;
		}
	});

	test("releases earlier batch claims when a later document is busy without transactions", async () => {
		const first = await create();
		const second = await create();
		assert(first.data && second.data);
		const firstTarget = { collectionKey: collection.key, id: first.data.id };
		const secondTarget = { collectionKey: collection.key, id: second.data.id };
		const supports = context.config.db.supports.bind(context.config.db);
		const capability = vi
			.spyOn(context.config.db, "supports")
			.mockImplementation((feature) =>
				feature === "transaction" ? false : supports(feature),
			);
		try {
			const acquired = await acquireDocumentWrites(context, {
				collectionKey: collection.key,
				ids: [secondTarget.id],
			});
			assert(acquired.data);
			await using _claim = acquired.data;
			const deleted = await deleteMultiple(context, {
				collectionKey: collection.key,
				ids: [firstTarget.id, secondTarget.id],
				userId: null,
			});
			expect(deleted.error?.status).toBe(409);
			expect(
				(await toolkit.documents.getEditable(firstTarget)).data?.editToken,
			).toBe(first.data.editToken);
			expect(
				(await toolkit.documents.getEditable(secondTarget)).error?.status,
			).toBe(409);
		} finally {
			capability.mockRestore();
		}
		expect(
			(await toolkit.documents.getEditable(secondTarget)).data?.editToken,
		).toBe(second.data.editToken);
	});
});

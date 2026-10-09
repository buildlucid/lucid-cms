import { randomUUID } from "node:crypto";
import { sql } from "kysely";
import { afterAll, assert, beforeAll, expect, test, vi } from "vitest";
import { PostgresAdapter } from "../../../../db-postgres/src/index.js";
import applyCollectionMigrations from "../../libs/collection/apply-collection-migrations.js";
import CollectionBuilder from "../../libs/collection/builders/collection-builder/index.js";
import planCollectionMigrations from "../../libs/collection/plan-collection-migrations.js";
import { getTableNames } from "../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import type { DatabaseConnection } from "../../libs/db/types.js";
import { createTranslationStore } from "../../libs/i18n/index.js";
import DocumentsRepository from "../../libs/repositories/documents.js";
import type { FieldInputSchema } from "../../schemas/collection-fields.js";
import type { LucidUser } from "../../types/hono.js";
import createServiceContext from "../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../utils/services/types.js";
import getTestConfig from "../../utils/test-helpers/get-test-config.js";
import readVersionContent from "../documents-versions/helpers/read-version-content.js";
import updateVersion from "../documents-versions/update-single.js";
import approve from "../requests/approve.js";
import complete from "../requests/complete.js";
import createSingle from "../requests/create-single.js";
import getSingle from "../requests/get-single.js";
import syncCollections from "../sync/sync-collections.js";
import deleteMultiple from "./delete-multiple.js";
import deleteSingle from "./delete-single.js";
import deleteSinglePermanently from "./delete-single-permanently.js";
import upsertSingle from "./upsert-single.js";

const fixture = getTestConfig();
const postgresUrl = process.env.LUCID_REQUEST_TEST_POSTGRES_URL;
let postgresDatabase: DatabaseConnection | undefined;
const key = "relation_request_docs";
const collection = new CollectionBuilder(key, {
	mode: "multiple",
	details: { labels: { singular: "Document", plural: "Documents" } },
	publishing: {
		review: {
			targets: [],
			selfApproval: true,
		},
		targets: [{ key: "staging", label: "Staging" }],
	},
})
	.addText("title", { localized: false, validation: { required: true } })
	.addRelation("related", { collection: key, multiple: true });
let context: ServiceContext;
let actor: LucidUser;

beforeAll(async () => {
	const config = await fixture.getConfig();
	const adapter = postgresUrl
		? new PostgresAdapter({ url: postgresUrl, max: 10 })
		: config.db;
	const database = postgresUrl
		? await adapter.connect()
		: await fixture.getDatabase();
	if (postgresUrl) postgresDatabase = database;
	context = createServiceContext({
		config: {
			...config,
			db: adapter,
			collections: [collection],
			email: { ...config.email, simulate: true },
		},
		database,
		translationStore: createTranslationStore({
			defaultLocale: "en",
			bundles: { en: { admin: {}, server: {} } },
		}),
	});
	if (postgresUrl) await adapter.migrateCoreToLatest(database);
	else {
		await fixture.migrate();
	}
	assert(!(await syncCollections(context)).error);
	const plan = await planCollectionMigrations(context);
	assert(plan.data, JSON.stringify(plan.error));
	assert(!(await applyCollectionMigrations(context, plan.data)).error);
	const user = await context.db.kysely
		.insertInto("lucid_users")
		.values({
			email: `${randomUUID()}@example.test`,
			username: randomUUID(),
			secret: "test",
			super_admin: true,
		})
		.returning(["id", "email", "username"])
		.executeTakeFirstOrThrow();
	actor = { ...user, superAdmin: true, permissions: [] };
});
afterAll(async () => {
	await postgresDatabase?.destroy();
	await fixture.destroy();
});

const fields = (title: string, ids: number[]): FieldInputSchema[] => [
	{ key: "title", type: "text", value: title },
	{
		key: "related",
		type: "relation",
		value: ids.map((id) => ({ collectionKey: key, id })),
	},
];
const save = async (title: string, ids: number[], documentId?: number) => {
	const result = await upsertSingle(context, {
		collectionKey: key,
		userId: actor.id,
		documentId,
		fields: fields(title, ids),
	});
	assert(result.data, JSON.stringify(result.error));
	return result.data;
};
const approved = async (documentId: number, target: string) => {
	const created = await createSingle(context, {
		type: "publish",
		user: actor,
		title: `Publish to ${target}`,
		documents: [
			{ collectionKey: key, documentId, source: "latest", targets: [target] },
		],
	});
	assert(created.data, JSON.stringify(created.error));
	const request = await getSingle(context, {
		id: created.data.id,
		user: actor,
	});
	assert(request.data, JSON.stringify(request.error));
	const decision = await approve(context, {
		id: request.data.id,
		user: actor,
		ifUnchanged: request.data.reviewToken,
	});
	assert(!decision.error, JSON.stringify(decision.error));
	const read = await getSingle(context, { id: request.data.id, user: actor });
	assert(read.data, JSON.stringify(read.error));
	return read.data;
};

test("bulk relation deletion claims cross-related documents once, dismisses approvals and preserves frozen request references", async () => {
	const first = await save("First", []);
	const second = await save("Second", [first]);
	await save("First", [second], first);
	const owner = await save("Owner", [first, second]);
	const firstRequest = await approved(owner, "staging");
	const stagingRequest = await approved(owner, "staging");
	const item = firstRequest.documents[0];
	assert(item?.approvedVersionId);
	assert(item.versionId);
	const approvedVersionId = item.approvedVersionId;
	const before = await readVersionContent(context, {
		collectionKey: key,
		documentId: owner,
		versionType: "latest",
	});
	assert(before.data);
	const frozen = await readVersionContent(context, {
		collectionKey: key,
		documentId: owner,
		versionId: approvedVersionId,
	});
	assert(frozen.data);
	const deleted = await deleteMultiple(context, {
		collectionKey: key,
		ids: [first, second],
		userId: actor.id,
	});
	expect(deleted.error).toBeUndefined();
	const after = await readVersionContent(context, {
		collectionKey: key,
		documentId: owner,
		versionType: "latest",
	});
	assert(after.data, JSON.stringify(after.error));
	expect(after.data.contentId).not.toBe(before.data.contentId);
	expect(
		after.data.content.fields.find((field) => field.key === "related"),
	).toMatchObject({ value: [] });
	const invalidated = await getSingle(context, {
		id: firstRequest.id,
		user: actor,
	});
	assert(invalidated.data, JSON.stringify(invalidated.error));
	expect(invalidated.data.approved).toBe(false);
	expect(invalidated.data.revision).toBeGreaterThan(firstRequest.revision);
	expect(invalidated.data.events.map((event) => event.type)).toContain(
		"approval_dismissed",
	);
	for (const versionId of [approvedVersionId, item.versionId]) {
		const retained = await readVersionContent(context, {
			collectionKey: key,
			documentId: owner,
			versionId,
		});
		assert(retained.data, JSON.stringify(retained.error));
		expect(retained.data.content).toEqual(frozen.data.content);
	}
	const tables = await getTableNames(context, key);
	assert(tables.data);
	const documents = await context.db.kysely
		.selectFrom(tables.data.document)
		.select(["id", "is_deleted", "write_lock"])
		.where("id", "in", [first, second, owner])
		.execute();
	expect(
		documents
			.filter((document) => document.is_deleted)
			.map((document) => document.id)
			.sort(),
	).toEqual([first, second].sort());
	expect(documents.every((document) => document.write_lock === null)).toBe(
		true,
	);
	for (const id of [first, second]) {
		expect(
			(
				await deleteSinglePermanently(context, {
					collectionKey: key,
					id,
					userId: actor.id,
				})
			).error,
		).toBeUndefined();
	}
	const afterPermanent = await readVersionContent(context, {
		collectionKey: key,
		documentId: owner,
		versionId: approvedVersionId,
	});
	expect(afterPermanent.data?.content).toEqual(frozen.data.content);
	//* every request of the document may link to the deleted documents, so all lose their approval
	const stagingAfter = await getSingle(context, {
		id: stagingRequest.id,
		user: actor,
	});
	assert(stagingAfter.data, JSON.stringify(stagingAfter.error));
	expect(stagingAfter.data.approved).toBe(false);
	expect(
		(await complete(context, { id: stagingRequest.id, user: actor })).error,
	).toBeDefined();
	const staging = await readVersionContent(context, {
		collectionKey: key,
		documentId: owner,
		versionType: "staging",
	});
	expect(staging.data).toBeNull();
	const retained = await readVersionContent(context, {
		collectionKey: key,
		documentId: owner,
		versionId: approvedVersionId,
	});
	expect(retained.data?.content).toEqual(frozen.data.content);
});

test.skipIf(!postgresUrl)(
	"proposal relation validation holds its live target until the transaction commits",
	async () => {
		const target = await save("Referenced target", []);
		const owner = await save("Proposal owner", []);
		const group = await createSingle(context, {
			type: "publish",
			user: actor,
			title: "First reference in a proposal",
			documents: [
				{
					collectionKey: key,
					documentId: owner,
					source: "latest",
					targets: ["staging"],
				},
			],
		});
		assert(group.data, JSON.stringify(group.error));
		const request = await getSingle(context, {
			id: group.data.id,
			user: actor,
		});
		assert(request.data, JSON.stringify(request.error));
		const item = request.data.documents[0];
		assert(item?.versionId);
		let signalValidated: (() => void) | undefined;
		let finishValidation: (() => void) | undefined;
		const validated = new Promise<void>((resolve) => {
			signalValidated = resolve;
		});
		const finish = new Promise<void>((resolve) => {
			finishValidation = resolve;
		});
		const selectValidation =
			DocumentsRepository.prototype.selectMultipleValidationIds;
		const validation = vi
			.spyOn(DocumentsRepository.prototype, "selectMultipleValidationIds")
			.mockImplementation(async function (props, dynamicConfig) {
				const result = await selectValidation.call(this, props, dynamicConfig);
				if (props.protectTargets && props.ids.includes(target)) {
					signalValidated?.();
					await finish;
				}
				return result;
			});
		const proposal = updateVersion(context, {
			collectionKey: key,
			documentId: owner,
			versionId: item.versionId,
			userId: actor.id,
			authUser: actor,
			fields: fields("Proposal owner", [target]),
		});
		let deletion: ReturnType<typeof deleteSingle> | undefined;
		try {
			await Promise.race([
				validated,
				proposal.then((result) => {
					throw new Error(
						`Proposal ended before target validation: ${JSON.stringify(result.error)}`,
					);
				}),
			]);
			deletion = deleteSingle(context, {
				collectionKey: key,
				id: target,
				userId: actor.id,
			});
			const deadline = Date.now() + 5000;
			let waiting = 0;
			while (waiting === 0 && Date.now() < deadline) {
				const result = await sql<{
					count: string;
				}>`select count(*)::text as count from pg_stat_activity where datname = current_database() and usename = current_user and wait_event_type = 'Lock' and query like '%write_lock%'`.execute(
					context.db.kysely,
				);
				waiting = Number(result.rows[0]?.count ?? 0);
				if (waiting === 0) {
					await new Promise((resolve) => setTimeout(resolve, 10));
				}
			}
			expect(waiting).toBeGreaterThan(0);
		} finally {
			finishValidation?.();
			await Promise.all([proposal, deletion]);
			validation.mockRestore();
		}
		assert(deletion);
		const [saved, deleted] = await Promise.all([proposal, deletion]);
		assert(saved.data, JSON.stringify(saved.error));
		expect(deleted.error).toBeUndefined();
		const retained = await readVersionContent(context, {
			collectionKey: key,
			documentId: owner,
			versionId: item.versionId,
		});
		expect(
			retained.data?.content.fields.find((field) => field.key === "related"),
		).toMatchObject({ value: [{ collectionKey: key, id: target }] });
		const latest = await readVersionContent(context, {
			collectionKey: key,
			documentId: owner,
			versionType: "latest",
		});
		expect(
			latest.data?.content.fields.find((field) => field.key === "related"),
		).toMatchObject({ value: [] });
		//* the proposal still points at the deleted target, so it cannot be approved
		expect(
			(
				await approve(context, {
					id: request.data.id,
					user: actor,
					ifUnchanged: request.data.reviewToken,
				})
			).error,
		).toBeDefined();
	},
);

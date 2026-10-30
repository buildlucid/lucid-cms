import { randomUUID } from "node:crypto";
import { afterAll, assert, beforeAll, expect, test } from "vitest";
import CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import { createTranslationStore } from "../../../libs/i18n/index.js";
import { Permissions } from "../../../libs/permission/definitions.js";
import createServiceContext from "../../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import getTestConfig from "../../../utils/test-helpers/get-test-config.js";
import resolveDocumentRefs from "./resolve-document-refs.js";

const fixture = getTestConfig();
const pages = new CollectionBuilder("ref_detail_pages", {
	mode: "multiple",
	details: { labels: { singular: "Page", plural: "Pages" } },
}).addText("title");

let context: ServiceContext;
let userId: number;
let emailId: number;

beforeAll(async () => {
	const config = await fixture.getConfig();
	context = createServiceContext({
		config: { ...config, collections: [pages] },
		database: await fixture.getDatabase(),
		translationStore: createTranslationStore({
			defaultLocale: "en",
			bundles: { en: { admin: {}, server: {} } },
		}),
	});
	await fixture.migrate();

	const user = await context.db.kysely
		.insertInto("lucid_users")
		.values({
			email: `${randomUUID()}@example.test`,
			username: randomUUID(),
			secret: "test",
		})
		.returning("id")
		.executeTakeFirstOrThrow();
	userId = user.id;

	const email = await context.db.kysely
		.insertInto("lucid_emails")
		.values({
			from_address: "hello@example.test",
			from_name: "Example",
			to_address: "someone@example.test",
			subject: "Thanks for getting in touch",
			template: "contact-form",
			priority: "normal",
			type: "external",
			is_system: false,
			current_status: "delivered",
			attempt_count: 1,
		})
		.returning("id")
		.executeTakeFirstOrThrow();
	emailId = email.id;
});
afterAll(() => fixture.destroy());

const resolve = (permissions: string[]) =>
	resolveDocumentRefs(context, {
		collection: pages,
		collections: [pages],
		brickSchema: [],
		responses: [],
		versionType: "latest",
		refResources: "all",
		refTargets: [
			{ resource: "users", table: "lucid_users", value: userId },
			{ resource: "emails", table: "lucid_emails", value: emailId },
		],
		host: "https://example.test",
		reader: { superAdmin: false, permissions },
	});

test("admin refs show user emails and email delivery details only with the matching read permission", async () => {
	const restricted = await resolve([]);
	assert(restricted.data, JSON.stringify(restricted.error));
	expect(restricted.data.refs?.users?.[0]?.email).toBeUndefined();
	expect(restricted.data.refs?.emails?.[0]).toMatchObject({
		subject: "Thanks for getting in touch",
	});
	expect(restricted.data.refs?.emails?.[0]?.to).toBeUndefined();
	expect(restricted.data.refs?.emails?.[0]?.currentStatus).toBeUndefined();

	const allowed = await resolve([Permissions.UsersRead, Permissions.EmailRead]);
	assert(allowed.data, JSON.stringify(allowed.error));
	expect(allowed.data.refs?.users?.[0]?.email).toEqual(expect.any(String));
	expect(allowed.data.refs?.emails?.[0]).toMatchObject({
		to: "someone@example.test",
		currentStatus: "delivered",
	});
});

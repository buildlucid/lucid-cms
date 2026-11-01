import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, expect, test } from "vitest";
import createServiceContext from "../../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import getTestConfig from "../../../utils/test-helpers/get-test-config.js";
import { createTranslationStore } from "../../i18n/index.js";
import { Permissions } from "../../permission/definitions.js";
import createToolkit from "../create-toolkit.js";

const fixture = getTestConfig();
let context: ServiceContext;

beforeAll(async () => {
	context = createServiceContext({
		config: await fixture.getConfig(),
		database: await fixture.getDatabase(),
		translationStore: createTranslationStore({
			defaultLocale: "en",
			bundles: { en: { admin: {}, server: {} } },
		}),
	});
	await fixture.migrate();
});
afterAll(() => fixture.destroy());

const insertUser = async (permissions: string[]) => {
	const user = await context.db.kysely
		.insertInto("lucid_users")
		.values({
			email: `${randomUUID()}@example.test`,
			username: randomUUID(),
			secret: "test",
		})
		.returning("id")
		.executeTakeFirstOrThrow();
	if (permissions.length === 0) return user.id;

	const role = await context.db.kysely
		.insertInto("lucid_roles")
		.values({ name: randomUUID(), description: null, key: null, locked: false })
		.returning("id")
		.executeTakeFirstOrThrow();
	await context.db.kysely
		.insertInto("lucid_user_roles")
		.values({ user_id: user.id, role_id: role.id })
		.execute();
	await context.db.kysely
		.insertInto("lucid_role_permissions")
		.values(
			permissions.map((permission) => ({
				role_id: role.id,
				permission,
				core: true,
			})),
		)
		.execute();
	return user.id;
};

const insertEmail = async (subject: string, isSystem: boolean) => {
	const email = await context.db.kysely
		.insertInto("lucid_emails")
		.values({
			from_address: "hello@example.test",
			from_name: "Example",
			to_address: "someone@example.test",
			subject,
			template: "contact-form",
			priority: "normal",
			type: "external",
			is_system: isSystem,
			current_status: "delivered",
			attempt_count: 1,
		})
		.returning("id")
		.executeTakeFirstOrThrow();
	return email.id;
};

test("user actors need email:read and don't see system emails, which the system does", async () => {
	const subject = randomUUID();
	const external = await insertEmail(subject, false);
	const system = await insertEmail(subject, true);
	const reader = await insertUser([Permissions.EmailRead]);
	const toolkit = createToolkit(context);
	const listed = async (actor?: { type: "user"; userId: number }) =>
		(
			await toolkit.email.getMultiple({
				actor,
				query: { filter: { subject: { value: subject } } },
			})
		).data?.items.map((email) => email.id);

	expect(
		(
			await toolkit.email.getSingle({
				id: external,
				actor: { type: "user", userId: await insertUser([]) },
			})
		).error?.status,
	).toBe(403);
	expect(await listed({ type: "user", userId: reader })).toEqual([external]);
	expect(await listed()).toEqual(expect.arrayContaining([external, system]));
	expect(
		(
			await toolkit.email.getSingle({
				id: system,
				actor: { type: "user", userId: reader },
			})
		).error?.status,
	).toBe(404);
	expect((await toolkit.email.getSingle({ id: system })).data).toMatchObject({
		id: system,
		currentStatus: "delivered",
		html: null,
	});
});

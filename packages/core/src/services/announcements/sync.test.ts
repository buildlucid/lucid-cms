import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";
import { createTranslationStore } from "../../libs/i18n/index.js";
import type { RemoteAnnouncement } from "../../libs/lucid-remote/services/get-announcements/index.js";
import createServiceContext from "../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../utils/services/types.js";
import { createTestQueueAdapter } from "../../utils/test-helpers/create-jobs-context.js";
import getTestConfig from "../../utils/test-helpers/get-test-config.js";
import syncAnnouncements from "./sync.js";

const fixture = getTestConfig();
let context: ServiceContext;

const createAdmin = () =>
	context.db.kysely
		.insertInto("lucid_users")
		.values({
			email: `${randomUUID()}@example.test`,
			username: randomUUID(),
			secret: "test",
			super_admin: true,
		})
		.execute();

beforeAll(async () => {
	const config = await fixture.getConfig();
	context = createServiceContext({
		config: { ...config, email: { ...config.email, simulate: true } },
		database: await fixture.getDatabase(),
		queue: createTestQueueAdapter(),
		translationStore: createTranslationStore({
			defaultLocale: "en",
			bundles: { en: { admin: {}, server: {} } },
		}),
	});
	await fixture.migrate();
	await createAdmin();
});
afterEach(() => {
	vi.unstubAllGlobals();
});
afterAll(async () => {
	await fixture.destroy();
});

const announcement = (
	values: Partial<RemoteAnnouncement> & Pick<RemoteAnnouncement, "publicId">,
): RemoteAnnouncement => ({
	type: "announcement",
	title: "Lucid 1.0 is coming",
	message: "Read the upgrade guide.",
	url: null,
	lucidVersions: null,
	...values,
});
const serve = (data: RemoteAnnouncement[]) => {
	const fetchMock = vi.fn(async () => Response.json({ data }));
	vi.stubGlobal("fetch", fetchMock);
	return fetchMock;
};
const sync = async () => {
	const result = await syncAnnouncements(context);
	expect(result.error).toBeUndefined();
};
const notification = (key: string) =>
	context.db.kysely
		.selectFrom("lucid_notifications")
		.select(["type", "href", "data", "resolved_at", "updated_at"])
		.where("key", "=", `announcement:${key}`)
		.executeTakeFirst();

test("mirrors announcements for this version and resolves ones that end", async () => {
	serve([
		announcement({
			publicId: "security",
			type: "security",
			title: "Update core",
			url: "https://github.com/buildlucid/lucid-cms/security",
			lucidVersions: ">=0.0.0",
		}),
		announcement({ publicId: "older", lucidVersions: "<0.0.1" }),
		announcement({ publicId: "news", url: "https://example.com/phish" }),
		announcement({
			publicId: "normalised",
			url: "HTTPS://lucidjs.build/blog",
		}),
	]);
	await sync();

	expect((await notification("normalised"))?.href).toBe(
		"https://lucidjs.build/blog",
	);
	expect(await notification("security")).toMatchObject({
		type: "lucid:security-alert",
		href: "https://github.com/buildlucid/lucid-cms/security",
		resolved_at: null,
	});
	expect(await notification("older")).toBeUndefined();
	//* links outside Lucid are dropped, keeping the announcement
	expect(await notification("news")).toMatchObject({
		type: "lucid:announcement",
		href: null,
	});

	const before = await notification("news");
	serve([announcement({ publicId: "news", url: "https://example.com/phish" })]);
	await sync();

	//* unchanged ones keep their place, and ones Lucid stops sending are resolved
	expect((await notification("news"))?.updated_at).toEqual(before?.updated_at);
	expect((await notification("security"))?.resolved_at).not.toBeNull();
});

test("adds people who gain access while an alert is live", async () => {
	serve([
		announcement({ publicId: "ongoing", type: "security", title: "Update" }),
	]);
	await sync();
	const before = await notification("ongoing");
	await createAdmin();
	await sync();

	const recipients = await context.db.kysely
		.selectFrom("lucid_notification_recipients")
		.innerJoin(
			"lucid_notifications",
			"lucid_notifications.id",
			"lucid_notification_recipients.notification_id",
		)
		.select("lucid_notification_recipients.user_id")
		.where("lucid_notifications.key", "=", "announcement:ongoing")
		.execute();
	expect(recipients).toHaveLength(2);
	expect((await notification("ongoing"))?.updated_at).toEqual(
		before?.updated_at,
	);
});

test("refreshes edited announcements", async () => {
	serve([announcement({ publicId: "edited", title: "Before" })]);
	await sync();
	serve([announcement({ publicId: "edited", title: "After" })]);
	await sync();

	expect((await notification("edited"))?.data).toMatchObject({
		title: "After",
	});
});

test("leaves notifications alone when Lucid can't be reached", async () => {
	serve([announcement({ publicId: "kept" })]);
	await sync();
	vi.stubGlobal(
		"fetch",
		vi.fn(async () => new Response(null, { status: 503 })),
	);
	await sync();

	expect((await notification("kept"))?.resolved_at).toBeNull();
});

test("doesn't contact Lucid when announcements are turned off", async () => {
	const fetchMock = serve([]);
	const result = await syncAnnouncements({
		...context,
		config: { ...context.config, announcements: false },
	});

	expect(result.error).toBeUndefined();
	expect(fetchMock).not.toHaveBeenCalled();
});

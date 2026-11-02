import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, expect, test } from "vitest";
import { createTranslationStore } from "../../libs/i18n/index.js";
import hashSecret from "../../utils/helpers/hash-secret.js";
import createServiceContext from "../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../utils/services/types.js";
import getTestConfig from "../../utils/test-helpers/get-test-config.js";
import authorizeShare from "./authorize-share.js";
import getShareAccess from "./get-share-access.js";

const testConfig = getTestConfig();
let context: ServiceContext;
afterAll(testConfig.destroy);

beforeAll(async () => {
	await testConfig.migrate();
	context = createServiceContext({
		config: await testConfig.getConfig(),
		database: await testConfig.getDatabase(),
		translationStore: createTranslationStore({
			defaultLocale: "en",
			bundles: {},
		}),
	});
});

const hashPassword = (password: string) =>
	hashSecret(password, context.config.secrets.encryption);

const createLink = async (token: string, password: string) => {
	const media = await context.db.kysely
		.insertInto("lucid_media")
		.values({
			key: `${token}.png`,
			uid: randomUUID(),
			origin: "human",
			type: "image",
			mime_type: "image/png",
			file_extension: "png",
			file_size: 1,
			storage_adapter_key: "test",
			public: false,
		})
		.returning("id")
		.executeTakeFirstOrThrow();
	await context.db.kysely
		.insertInto("lucid_media_share_links")
		.values({
			media_id: media.id,
			token,
			password: await hashPassword(password),
		})
		.execute();
};

/** Checks a session as the stream and download routes do. */
const opens = async (token: string, sessionCookie?: string) => {
	const [authorizeRes, accessRes] = await Promise.all([
		authorizeShare(context, {
			token,
			sessionCookie,
			enforcePasswordSession: true,
		}),
		getShareAccess(context, { token, sessionCookie }),
	]);
	return (
		authorizeRes.error === undefined &&
		accessRes.data?.passwordRequired === false
	);
};

test("password links only open with the session their password gives, until the password changes", async () => {
	const token = "share-session";
	await createLink(token, "first-password");

	expect(await opens(token)).toBe(false);
	expect(await opens(token, "anything")).toBe(false);
	expect(
		(await authorizeShare(context, { token, providedPassword: "wrong" })).error
			?.status,
	).toBe(401);

	const authorizeRes = await authorizeShare(context, {
		token,
		providedPassword: "first-password",
	});
	const session = authorizeRes.data?.session;
	expect(session).toMatch(/^\d+\.[\w-]+$/);
	expect(await opens(token, session)).toBe(true);

	//* moving the expiry breaks the signature
	const [expiresAt, signature] = session?.split(".") ?? [];
	expect(await opens(token, `${Number(expiresAt) + 60}.${signature}`)).toBe(
		false,
	);

	await context.db.kysely
		.updateTable("lucid_media_share_links")
		.set({ password: await hashPassword("second-password") })
		.where("token", "=", token)
		.execute();
	expect(await opens(token, session)).toBe(false);
});

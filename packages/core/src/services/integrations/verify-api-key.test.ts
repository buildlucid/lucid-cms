import { afterAll, beforeAll, expect, test } from "vitest";
import { createTranslationStore } from "../../libs/i18n/index.js";
import {
	decodeApiKey,
	encodeApiKey,
} from "../../utils/integrations/encode-api-key.js";
import createServiceContext from "../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../utils/services/types.js";
import getTestConfig from "../../utils/test-helpers/get-test-config.js";
import createSingle from "./create-single.js";
import regenerateKeys from "./regenerate-keys.js";
import verifyApiKey from "./verify-api-key.js";

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

test("API keys verify until they're changed or regenerated", async () => {
	const createRes = await createSingle(context, {
		name: "Website",
		expiry: "never",
		scopes: [],
		userId: null,
	});
	if (createRes.error) throw new Error("Couldn't create the integration.");
	const apiKey = createRes.data.apiKey;

	expect((await verifyApiKey(context, { apiKey })).error).toBeUndefined();

	const { key } = decodeApiKey(apiKey);
	const wrongKey = encodeApiKey(key ?? "", "0".repeat(64));
	expect(
		(await verifyApiKey(context, { apiKey: wrongKey })).error,
	).toBeDefined();

	const integration = await context.db.kysely
		.selectFrom("lucid_integrations")
		.select("id")
		.where("key", "=", key ?? "")
		.executeTakeFirstOrThrow();
	const regenerateRes = await regenerateKeys(context, {
		id: integration.id,
		userId: null,
	});
	if (regenerateRes.error) throw new Error("Couldn't regenerate the key.");

	expect((await verifyApiKey(context, { apiKey })).error).toBeDefined();
	expect(
		(await verifyApiKey(context, { apiKey: regenerateRes.data.apiKey })).error,
	).toBeUndefined();
});

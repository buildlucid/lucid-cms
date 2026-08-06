import { expect, test } from "vitest";
import { createTranslationStore } from "../../libs/i18n/index.js";
import getTestConfig from "../test-helpers/get-test-config.js";
import createServiceContext from "./create-service-context.js";

test("uses the configured interface locale outside the HTTP request pipeline", async () => {
	const testConfig = getTestConfig();
	const config = await testConfig.getConfig();
	const database = await testConfig.getDatabase();
	const localizedConfig = {
		...config,
		i18n: {
			...config.i18n,
			defaultLocale: "fr",
		},
	};
	const translationStore = createTranslationStore({
		defaultLocale: "fr",
		bundles: {
			fr: {
				admin: {},
				server: {
					"test.message": "Message français",
				},
			},
		},
	});

	const context = createServiceContext({
		config: localizedConfig,
		database,
		translationStore,
	});

	expect(context.request.locale).toBe("fr");
	expect(context.translate("server:test.message")).toBe("Message français");
	await testConfig.destroy();
});

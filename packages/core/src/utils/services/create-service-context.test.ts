import { expect, test } from "vitest";
import type { DatabaseConnection } from "../../libs/db/types.js";
import { createTranslationStore } from "../../libs/i18n/index.js";
import getTestConfig from "../test-helpers/get-test-config.js";
import createServiceContext from "./create-service-context.js";

test("uses the configured interface locale outside the HTTP request pipeline", async () => {
	const config = await getTestConfig().getConfig();
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
		database: {
			client: {} as DatabaseConnection["client"],
			destroy: async () => undefined,
		},
		translationStore,
	});

	expect(context.request.locale).toBe("fr");
	expect(context.translate("server:test.message")).toBe("Message français");
});

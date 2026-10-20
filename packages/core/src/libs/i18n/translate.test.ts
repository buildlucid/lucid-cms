import { expect, test } from "vitest";
import {
	copy,
	createTranslationStore,
	createTranslator,
	translate,
} from "./index.js";

const store = createTranslationStore({
	defaultLocale: "en",
	bundles: {
		en: {
			admin: {
				"tests.label": "English admin {{value}}",
			},
			server: {
				"tests.message": "English server {{value}}",
			},
		},
		fr: {
			admin: {
				"tests.label": "French admin {{value}}",
			},
			server: {
				"tests.message": "French server {{value}}",
			},
			site: {
				"nav.greeting": "Bonjour {{name}}",
			},
		},
	},
});

test("global translate resolves core copy only with a single options object", () => {
	expect(
		translate("server:core.config.duplicate.keys", {
			data: {
				builder: "collections",
			},
		}),
	).toBe("Duplicate keys found for collections builder.");

	expect(
		translate("server:tests.message", {
			data: {
				value: "copy",
			},
			defaultMessage: "Fallback {{value}}",
		}),
	).toBe("Fallback copy");
});

test("bound translators resolve project copy, core copy, and descriptor data", () => {
	const translator = createTranslator({ store, locale: "fr" });

	expect(
		translator("server:tests.message", {
			data: {
				value: "copy",
			},
		}),
	).toBe("French server copy");
	expect(
		translator("admin:tests.label", {
			data: {
				value: "copy",
			},
		}),
	).toBe("French admin copy");
	expect(
		translator.english("server:tests.message", {
			data: {
				value: "copy",
			},
		}),
	).toBe("English server copy");
	expect(
		translator("server:core.config.duplicate.keys", {
			data: {
				builder: "collections",
			},
		}),
	).toBe("Duplicate keys found for collections builder.");
	expect(
		translator(copy("server:tests.message", { data: { value: "base" } }), {
			data: {
				value: "override",
			},
		}),
	).toBe("French server override");
	expect(
		translator("server:constructor", {
			data: { value: "copy" },
			defaultMessage: "Fallback {{value}}",
		}),
	).toBe("Fallback copy");
});

test("translation stores expose admin bundles with English and default-locale fallbacks", () => {
	const fallbackStore = createTranslationStore({
		defaultLocale: "fr",
		bundles: {
			fr: {
				admin: {
					"tests.default": "French default",
					"tests.override": "French default",
				},
				server: {},
			},
			es: {
				admin: {
					"tests.override": "Spanish target",
				},
				server: {},
			},
		},
	});

	expect(fallbackStore.admin({ locale: "es" })).toMatchObject({
		"core.permissions.update.jobs": "Update Schedules",
		"tests.default": "French default",
		"tests.override": "Spanish target",
	});
});

test("other scopes are looked up in one locale without falling back, and listed by locale", () => {
	const translator = createTranslator({ store, locale: "fr" });

	expect(
		translator.lookup({
			scope: "site",
			key: "nav.greeting",
			data: { name: "Ada" },
		}),
	).toBe("Bonjour Ada");
	expect(
		translator.lookup({ scope: "site", key: "nav.greeting", locale: "en" }),
	).toBeUndefined();
	expect(
		translator.lookup({ scope: "server", key: "core.config.duplicate.keys" }),
	).toBeUndefined();
	expect(
		translator.lookup({
			scope: "site",
			key: "toString",
			data: { name: "Ada" },
		}),
	).toBeUndefined();
	expect(translator.scopeBundles("site")).toEqual({
		en: {},
		fr: { "nav.greeting": "Bonjour {{name}}" },
	});
});

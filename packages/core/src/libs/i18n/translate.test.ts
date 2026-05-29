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
		"core.ai.guidance.improve.label": "Improve",
		"tests.default": "French default",
		"tests.override": "Spanish target",
	});
});

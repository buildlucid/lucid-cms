import { afterAll, beforeAll, expect, test } from "vitest";
import { createTranslationStore } from "../../libs/i18n/index.js";
import createServiceContext from "../../utils/services/create-service-context.js";
import type { ServiceContext } from "../../utils/services/types.js";
import { createTestQueueAdapter } from "../../utils/test-helpers/create-jobs-context.js";
import getTestConfig from "../../utils/test-helpers/get-test-config.js";
import syncLocales from "../sync/sync-locales.js";
import createGlossaryTerm from "./create-glossary-term.js";
import getSettings from "./get-settings.js";
import updateGlossaryTerm from "./update-glossary-term.js";
import updateStyle from "./update-style.js";

const fixture = getTestConfig();
let context: ServiceContext;
let userId: number;

beforeAll(async () => {
	const config = await fixture.getConfig();
	context = createServiceContext({
		config: {
			...config,
			localization: {
				locales: [
					{ code: "en", label: "English" },
					{ code: "fr", label: "French" },
				],
				defaultLocale: "en",
			},
		},
		database: await fixture.getDatabase(),
		queue: createTestQueueAdapter(async () => ({
			error: undefined,
			data: undefined,
		})),
		translationStore: createTranslationStore({
			defaultLocale: "en",
			bundles: { en: { admin: {}, server: {} } },
		}),
	});
	await fixture.migrate();
	expect((await syncLocales(context)).error).toBeUndefined();
	const user = await context.db.kysely
		.insertInto("lucid_users")
		.values({
			email: "editor@example.test",
			username: "editor",
			secret: "test",
			super_admin: true,
		})
		.returning(["id"])
		.executeTakeFirstOrThrow();
	userId = user.id;
});

afterAll(async () => {
	await fixture.destroy();
});

test("a term is listed once per locale whatever its case, and an update can keep its own", async () => {
	const term = { translation: null, userId };
	const all = await createGlossaryTerm(context, {
		...term,
		term: "Lucid",
		locale: null,
	});
	expect(all.error).toBeUndefined();
	expect(
		(
			await createGlossaryTerm(context, {
				...term,
				term: "lucid",
				locale: null,
			})
		).error?.status,
	).toBe(400);
	const french = await createGlossaryTerm(context, {
		...term,
		term: "Lucid",
		locale: "fr",
	});
	expect(french.error).toBeUndefined();
	expect(
		(
			await createGlossaryTerm(context, {
				...term,
				term: "Lucid",
				locale: "de",
			})
		).error?.status,
	).toBe(400);

	expect(
		(
			await updateGlossaryTerm(context, {
				...term,
				id: french.data ?? 0,
				term: "LUCID",
				locale: null,
			})
		).error?.status,
	).toBe(400);
	expect(
		(
			await updateGlossaryTerm(context, {
				...term,
				id: all.data ?? 0,
				term: "LUCID",
				locale: null,
				translation: null,
			})
		).error,
	).toBeUndefined();
});

test("style notes are set per locale, and empty notes remove them", async () => {
	const style = { locale: "fr", userId };
	expect(
		(await updateStyle(context, { ...style, instructions: "Use vous." })).error,
	).toBeUndefined();
	expect((await getSettings(context)).data?.styles).toEqual([
		{ locale: "fr", instructions: "Use vous." },
	]);

	expect(
		(await updateStyle(context, { ...style, instructions: "" })).error,
	).toBeUndefined();
	expect((await getSettings(context)).data?.styles).toEqual([]);
});

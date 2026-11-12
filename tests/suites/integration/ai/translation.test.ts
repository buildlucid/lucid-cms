import { failGenerate } from "#harness/client";
import { describe, expect, requires, test } from "#harness/vitest";
import { connectLucid, generateRequests } from "#shared/helpers/ai";
import { createDocument } from "#shared/helpers/documents";

const GUIDE = "guide";

type Translated =
	| {
			delivery: "editor";
			changes: Array<{ path: string[]; locale: string; value: unknown }>;
			failures: unknown[];
	  }
	| {
			delivery: "request";
			requests: Array<{ id: number; locale: string; documents: number }>;
			queued: boolean;
			failures: unknown[];
	  };

const guide = (title: string) => ({
	fields: [{ key: "title", type: "text", translations: { en: title } }],
});

describe("AI translation", () => {
	requires("feature:ai", "collection:guide", "locale:fr");

	test("returns translations for the open editor without saving them", async ({
		lucid,
	}) => {
		await connectLucid(lucid);
		const admin = await lucid.admin();
		const id = await createDocument(admin, GUIDE, guide("Hello there"));

		const translated = await admin.request<{ data: Translated }>({
			method: "POST",
			path: `/api/v1/documents/${GUIDE}/translate`,
			body: { documentIds: [id], targetLocales: ["fr"], delivery: "editor" },
		});
		expect(translated.status).toBe(200);
		expect(translated.body.data).toMatchObject({
			delivery: "editor",
			changes: [{ path: ["title"], locale: "fr", value: "[fr] Hello there" }],
		});

		const saved = await admin.request<{
			data: { fields: Record<string, unknown> };
		}>({ path: `/api/v1/documents/${GUIDE}/${id}/latest` });
		expect(JSON.stringify(saved.body.data.fields)).not.toContain("[fr]");
	});

	test("opens a request per locale with the translated content", async ({
		lucid,
	}) => {
		await connectLucid(lucid);
		const admin = await lucid.admin();
		const id = await createDocument(admin, GUIDE, guide("Good morning"));

		const translated = await admin.request<{ data: Translated }>({
			method: "POST",
			path: `/api/v1/documents/${GUIDE}/translate`,
			body: { documentIds: [id], targetLocales: ["fr"] },
		});
		expect(translated.status).toBe(200);
		const data = translated.body.data;
		expect(data.delivery).toBe("request");
		if (data.delivery !== "request") {
			return;
		}
		expect(data.failures).toEqual([]);
		expect(data.requests).toMatchObject([{ locale: "fr", documents: 1 }]);

		const opened = await admin.request({
			path: `/api/v1/requests/${data.requests[0]?.id}`,
		});
		expect(opened.status).toBe(200);
		expect(JSON.stringify(opened.body)).toContain(String(id));
	});

	test("sends the glossary terms the content uses", async ({ lucid }) => {
		const connection = await connectLucid(lucid);
		const admin = await lucid.admin();
		const term = `Harness${crypto.randomUUID().slice(0, 6)}`;
		const glossary = await admin.request({
			method: "POST",
			path: "/api/v1/translations/glossary",
			body: { term, locale: null, translation: null },
		});
		expect(glossary.status).toBe(204);
		const id = await createDocument(admin, GUIDE, guide(`Welcome to ${term}`));

		await admin.request({
			method: "POST",
			path: `/api/v1/documents/${GUIDE}/translate`,
			body: { documentIds: [id], targetLocales: ["fr"], delivery: "editor" },
		});
		const sent = (
			await generateRequests(lucid, connection, "content.translate")
		).at(-1);
		expect(JSON.stringify(sent?.request)).toContain(term);
	});

	test("reports the documents Lucid couldn't translate", async ({ lucid }) => {
		await connectLucid(lucid);
		const admin = await lucid.admin();
		const id = await createDocument(admin, GUIDE, guide("Refused"));

		const translated = await admin.request<{ data: Translated }>({
			method: "POST",
			path: `/api/v1/documents/${GUIDE}/translate`,
			body: {
				documentIds: [id],
				targetLocales: ["fr"],
				delivery: "editor",
				note: failGenerate(400, "ai_content_blocked"),
			},
		});
		expect(translated.body.data?.failures).not.toEqual([]);
	});
});

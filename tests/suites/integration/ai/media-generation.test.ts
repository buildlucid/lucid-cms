import {
	describe,
	expect,
	requires,
	type Session,
	test,
} from "#harness/vitest";
import { failGenerate } from "#shared/agent-script";
import {
	chargedFor,
	connectLucid,
	generateRequests,
	usageSession,
} from "#shared/ai";
import { createMedia, getMedia } from "#shared/media";

type Generation = {
	requestId: string;
	type: "image" | "audio";
	status: string;
	output?: { url: string; storageKey: string; mimeType: string };
};

const POLL_MS = 100;

/** Starts an image or audio generation, as the media library's generate button does. */
const startGeneration = (
	session: Session,
	type: "image" | "audio",
	body: Record<string, unknown>,
) =>
	session.request<{ data: Generation }>({
		method: "POST",
		path: `/api/v1/ai/media/${type}`,
		headers: { "idempotency-key": crypto.randomUUID() },
		body,
	});

/** Polls a generation until Lucid finishes it, and returns the last answer. */
const waitForGeneration = async (session: Session, requestId: string) => {
	const deadline = Date.now() + 15_000;
	while (Date.now() < deadline) {
		const polled = await session.request<{ data: Generation }>({
			path: `/api/v1/ai/media/generations/${requestId}`,
		});
		if (!polled.ok || polled.body.data.status === "complete") {
			return polled;
		}
		await new Promise((resolve) => setTimeout(resolve, POLL_MS));
	}
	throw new Error(`Generation ${requestId} never finished.`);
};

/** A WebP header, as the admin sends an image to describe. Lucid's fake never looks inside. */
const WEBP = Buffer.from("RIFF\u0000\u0000\u0000\u0000WEBPVP8 ").toString(
	"base64",
);

describe("AI media", () => {
	requires("feature:ai", "feature:mediaStorage", "harness:outbox");

	test("generates an image and saves it as library media", async ({
		lucid,
	}) => {
		const connection = await connectLucid(lucid);
		const admin = await lucid.admin();
		const sessionId = crypto.randomUUID();

		const started = await startGeneration(admin, "image", {
			sessionId,
			instruction: "A red square",
			generation: { aspectRatio: "1:1" },
		});
		expect(started.status).toBe(202);
		const done = await waitForGeneration(admin, started.body.data.requestId);
		expect(done.body.data).toMatchObject({
			type: "image",
			status: "complete",
			output: { mimeType: "image/png" },
		});

		//* the preview goes through the CMS, as Lucid's file needs the connection's token
		const preview = await admin.fetch(done.body.data.output?.url ?? "");
		expect(preview.status).toBe(200);
		expect(preview.headers.get("content-type")).toBe("image/png");

		const saved = await admin.request<{
			data: { key: string; fileName: string };
		}>({
			method: "POST",
			path: `/api/v1/ai/media/generations/${started.body.data.requestId}/save`,
			body: { public: true },
		});
		expect(saved.status).toBe(200);
		const created = await createMedia(admin, saved.body.data.key, {
			title: "Red square",
			fileName: saved.body.data.fileName,
		});
		expect(created.status).toBe(201);
		const media = await getMedia(admin, created.body.data.id);
		expect(media.type).toBe("image");

		const usage = await usageSession(admin, "media-image", sessionId);
		expect(usage?.credits).toBe(await chargedFor(lucid, connection, sessionId));
	});

	test("generates speech from a script", async ({ lucid }) => {
		await connectLucid(lucid);
		const admin = await lucid.admin();

		const started = await startGeneration(admin, "audio", {
			script: "Welcome to the harness.",
		});
		expect(started.status).toBe(202);
		const done = await waitForGeneration(admin, started.body.data.requestId);
		expect(done.body.data).toMatchObject({
			type: "audio",
			status: "complete",
			output: { mimeType: "audio/mpeg" },
		});
	});

	test("reports Lucid's refusal without saving anything", async ({ lucid }) => {
		await connectLucid(lucid);
		const admin = await lucid.admin();

		const started = await startGeneration(admin, "image", {
			instruction: `Too expensive ${failGenerate(402, "organisation_ai_credit_exhausted")}`,
		});
		const done = started.ok
			? await waitForGeneration(admin, started.body.data.requestId)
			: started;
		expect(done.status).toBe(402);
		expect(JSON.stringify(done.body)).toMatch(/credit/i);
	});

	test("writes alt text, in each locale asked for", async ({ lucid }) => {
		const connection = await connectLucid(lucid);
		const admin = await lucid.admin();
		const describe = (target: string[] | null) =>
			admin.request<{ data: { output: Record<string, unknown> } }>({
				method: "POST",
				path: "/api/v1/ai/media/alt",
				body: {
					image: { data: WEBP, mimeType: "image/webp" },
					media: { name: "Harbour at dusk" },
					locale: { target },
				},
			});

		const single = await describe(null);
		expect(single.status).toBe(200);
		expect(single.body.data.output).toEqual({
			kind: "value",
			value: "Alt text for Harbour at dusk",
		});

		const translated = await describe(["en", "fr"]);
		expect(translated.body.data.output).toEqual({
			kind: "translations",
			translations: {
				en: "[en] Alt text for Harbour at dusk",
				fr: "[fr] Alt text for Harbour at dusk",
			},
		});
		expect(
			await generateRequests(lucid, connection, "media.alt.generate"),
		).not.toHaveLength(0);
	});

	test("saves a generation only for people who may make or change media", async ({
		lucid,
	}) => {
		await connectLucid(lucid);
		const admin = await lucid.admin();
		const started = await startGeneration(admin, "image", {
			instruction: "A blue circle",
		});
		await waitForGeneration(admin, started.body.data.requestId);
		const save = (session: Session) =>
			session.request({
				method: "POST",
				path: `/api/v1/ai/media/generations/${started.body.data.requestId}/save`,
				body: { public: false },
			});

		const generateOnly = await lucid.user({
			permissions: ["ai:image-generate"],
		});
		const mediaOnly = await lucid.user({ permissions: ["media:create"] });
		const both = await lucid.user({
			permissions: ["ai:image-generate", "media:update"],
		});
		expect((await save(generateOnly.session)).status).toBe(403);
		expect((await save(mediaOnly.session)).status).toBe(403);
		expect((await save(both.session)).status).not.toBe(403);
	});
});

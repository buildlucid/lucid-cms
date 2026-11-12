import type { MediaShareLink } from "@lucidcms/core/types";
import {
	advanceClock,
	describe,
	expect,
	requires,
	type Session,
	test,
} from "#harness/vitest";
import { files, uploadMedia } from "#shared/helpers/media";

const createLink = async (
	session: Session,
	mediaId: number,
	body: { password?: string; expiresAt?: string } = {},
) => {
	const created = await session.request<{ data: MediaShareLink }>({
		method: "POST",
		path: `/api/v1/media/${mediaId}/share-links`,
		body,
	});
	expect(created.status, JSON.stringify(created.body)).toBe(201);
	return created.body.data;
};

const stream = (session: Session, token: string) =>
	session.fetch(`/api/v1/share/${token}/stream`);

const authorize = (session: Session, token: string, password: string) =>
	session.request({
		method: "POST",
		path: `/api/v1/share/${token}/authorize`,
		body: { password },
	});

describe("media share links", () => {
	requires("feature:mediaStorage");

	test("serve private media to someone who isn't signed in", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const file = files.png();
		const id = await uploadMedia(admin, {
			title: "Shared",
			file,
			public: false,
		});
		const link = await createLink(admin, id);

		const served = await stream(lucid.session(), link.token);

		expect(served.status).toBe(200);
		expect(new Uint8Array(await served.arrayBuffer())).toEqual(
			new Uint8Array(file.bytes),
		);
	});

	test("offer documents as a download rather than a stream", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const id = await uploadMedia(admin, {
			title: "Document",
			file: files.text("Download me\n"),
			public: false,
		});
		const link = await createLink(admin, id);
		const visitor = lucid.session();

		const streamed = await stream(visitor, link.token);
		const requested = await visitor.request<{ data: { url: string } }>({
			method: "POST",
			path: `/api/v1/share/${link.token}/download`,
		});
		const url = new URL(requested.body.data.url);
		const downloaded = await visitor.fetch(url.pathname + url.search);

		expect(streamed.status).toBe(415);
		expect(downloaded.status).toBe(200);
		expect(downloaded.headers.get("content-disposition")).toMatch(
			/^attachment/,
		);
		expect(await downloaded.text()).toBe("Download me\n");
	});

	test("with a password, serve the file only once it is given", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const id = await uploadMedia(admin, {
			title: "Locked",
			file: files.png(),
			public: false,
		});
		const link = await createLink(admin, id, { password: "open-sesame-123" });
		const visitor = lucid.session();

		const before = await stream(visitor, link.token);
		const wrong = await authorize(visitor, link.token, "not-the-password");
		const stillLocked = await stream(visitor, link.token);
		const right = await authorize(visitor, link.token, "open-sesame-123");
		const after = await stream(visitor, link.token);
		const someoneElse = await stream(lucid.session(), link.token);

		expect(before.status).toBe(401);
		expect(wrong.status).toBeGreaterThanOrEqual(400);
		expect(stillLocked.status).toBe(401);
		expect(right.status).toBeLessThan(300);
		expect(after.status).toBe(200);
		expect(someoneElse.status).toBe(401);
	});

	test("stop working while their media is in the bin", async ({ lucid }) => {
		const admin = await lucid.admin();
		const id = await uploadMedia(admin, { title: "Binned", file: files.png() });
		const link = await createLink(admin, id);

		await admin.request({ method: "DELETE", path: `/api/v1/media/${id}` });
		const binned = await stream(lucid.session(), link.token);
		await admin.request({
			method: "POST",
			path: "/api/v1/media/restore",
			body: { ids: [id] },
		});
		const restored = await stream(lucid.session(), link.token);

		expect(binned.status).toBe(410);
		expect(restored.status).toBe(200);
	});

	test("stop working once deleted", async ({ lucid }) => {
		const admin = await lucid.admin();
		const id = await uploadMedia(admin, { title: "Unshared" });
		const link = await createLink(admin, id);

		const deleted = await admin.request({
			method: "DELETE",
			path: `/api/v1/media/${id}/share-links/${link.id}`,
		});

		expect(deleted.status).toBe(204);
		expect((await stream(lucid.session(), link.token)).status).toBe(404);
	});

	describe("with other people", () => {
		requires("harness:outbox");

		test("can't be made for someone else's personal media", async ({
			lucid,
		}) => {
			const owner = await lucid.user({
				permissions: ["media:create", "media:update"],
			});
			const id = await uploadMedia(owner.session, {
				title: "Personal",
				owned: true,
			});
			const other = await lucid.user({
				permissions: ["media:read-all", "media:create"],
			});

			const created = await other.session.request({
				method: "POST",
				path: `/api/v1/media/${id}/share-links`,
				body: {},
			});

			expect(created.status).toBeGreaterThanOrEqual(400);
		});
	});
});

describe("share links that expire", () => {
	requires("feature:mediaStorage", "mode:host");

	test("stop working when they expire", async ({ lucid }) => {
		const admin = await lucid.admin();
		const id = await uploadMedia(admin, {
			title: "Expiring",
			file: files.png(),
		});
		const link = await createLink(admin, id, {
			expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
		});
		const before = await stream(lucid.session(), link.token);

		advanceClock(2 * 60 * 60 * 1000);
		const after = await stream(lucid.session(), link.token);

		expect(before.status).toBe(200);
		expect(after.status).toBe(410);
	});
});

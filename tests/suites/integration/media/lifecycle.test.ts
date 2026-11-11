import {
	ADMIN,
	advanceClock,
	describe,
	expect,
	type Lucid,
	login,
	requires,
	type Session,
	test,
} from "#harness/vitest";
import { STORY_KEY } from "#shared/collections/story";
import { createDocument, readDocument } from "#shared/documents";
import { IMAGE_PRESET } from "#shared/fragments/media";
import {
	countVariants,
	createFolder,
	fetchCdn,
	files,
	getMedia,
	listStoredKeys,
	readStorageCounter,
	sumStoredSizes,
	uploadFile,
	uploadMedia,
} from "#shared/media";
import { uniqueName } from "#shared/permissions";

const DAY = 24 * 60 * 60 * 1000;

/** The IDs of the given media that the library or the bin lists. */
const listedIn = async (
	session: Session,
	ids: number[],
	place: "library" | "bin",
) => {
	const listed = await session.request<{ data: Array<{ id: number }> }>({
		path: "/api/v1/media",
		query: {
			"filter[id:in]": ids,
			"filter[isDeleted]": place === "bin" ? 1 : 0,
		},
	});
	expect(listed.status).toBe(200);
	return listed.body.data.map((media) => media.id).toSorted((a, b) => a - b);
};

const binMedia = (session: Session, id: number) =>
	session.request({ method: "DELETE", path: `/api/v1/media/${id}` });

const deletePermanently = (session: Session, id: number) =>
	session.request({ method: "DELETE", path: `/api/v1/media/${id}/permanent` });

/**
 * Signs the admin in on a new session. Tests that move the clock far ahead use one, as the
 * shared admin's tokens would be renewed in the future and refused once the clock is back.
 */
const signInAdmin = async (lucid: Lucid) => {
	const session = lucid.session();
	await login(session, ADMIN);
	return session;
};

/** Runs the daily job that deletes what has been in the bin too long, and expired uploads. */
const runExpiryJob = async (admin: Session) => {
	const triggered = await admin.request({
		method: "POST",
		path: "/api/v1/jobs/schedules/trigger",
		body: { scheduleKey: "core:delete-expired-data/automatic" },
	});
	expect(triggered.status).toBeLessThan(300);
};

describe("the media bin", () => {
	requires("feature:mediaStorage");

	test("moves media out of the library and back", async ({ lucid }) => {
		const admin = await lucid.admin();
		const id = await uploadMedia(admin, { title: "Binned" });

		await binMedia(admin, id);
		const whileBinned = {
			library: await listedIn(admin, [id], "library"),
			bin: await listedIn(admin, [id], "bin"),
		};
		await admin.request({
			method: "POST",
			path: "/api/v1/media/restore",
			body: { ids: [id] },
		});

		expect(whileBinned).toEqual({ library: [], bin: [id] });
		expect(await listedIn(admin, [id], "library")).toEqual([id]);
	});

	test("deleting a folder's contents bins the media in it and its subfolders", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const parent = await createFolder(admin, uniqueName("Parent"));
		const child = await createFolder(admin, uniqueName("Child"), parent);
		const inParent = await uploadMedia(admin, {
			title: "In parent",
			folderId: parent,
		});
		const inChild = await uploadMedia(admin, {
			title: "In child",
			folderId: child,
		});

		const deleted = await admin.request({
			method: "DELETE",
			path: "/api/v1/media/batch",
			body: {
				folderIds: [parent],
				mediaIds: [],
				recursiveMedia: true,
			},
		});

		expect(deleted.status).toBeLessThan(300);
		expect(await listedIn(admin, [inParent, inChild], "bin")).toEqual(
			[inParent, inChild].toSorted((a, b) => a - b),
		);
	});
});

describe("deleting media permanently", () => {
	requires("feature:mediaStorage");

	test("removes it and the links documents had to it", async ({ lucid }) => {
		requires(`collection:${STORY_KEY}`);
		const admin = await lucid.admin();
		const id = await uploadMedia(admin, { title: "Linked", file: files.png() });
		const { url } = await getMedia(admin, id);
		const story = await createDocument(admin, STORY_KEY, {
			fields: [
				{ key: "title", type: "text", value: "Links media" },
				{ key: "media", type: "media", value: [id] },
			],
		});

		const deleted = await deletePermanently(admin, id);

		expect(deleted.status).toBeLessThan(300);
		expect((await admin.request({ path: `/api/v1/media/${id}` })).status).toBe(
			404,
		);
		expect((await fetchCdn(lucid.session(), url)).status).toBe(404);
		expect((await readDocument(admin, STORY_KEY, story)).fields.media).toEqual(
			[],
		);
	});

	test("removes a video's poster with it", async ({ lucid }) => {
		const admin = await lucid.admin();
		const poster = await uploadMedia(admin, {
			title: "Poster",
			file: files.png(),
		});
		const posterUrl = (await getMedia(admin, poster)).url;
		const file = files.mp4();
		const videoKey = await uploadFile(admin, file);
		const video = await admin.request<{ data: { id: number } }>({
			method: "POST",
			path: "/api/v1/media",
			body: {
				key: videoKey,
				fileName: file.name,
				origin: "human",
				posterId: poster,
			},
		});

		await deletePermanently(admin, video.body.data.id);

		expect((await fetchCdn(lucid.session(), posterUrl)).status).toBe(404);
	});
});

describe("what deleted media leaves behind", () => {
	requires("plugin:filesystem", "plugin:sharp", "mode:host");

	test("its file, variants and storage are all freed", async ({ lucid }) => {
		const admin = await lucid.admin();
		const id = await uploadMedia(admin, { title: "Freed", file: files.png() });
		const { key, url } = await getMedia(admin, id);
		await fetchCdn(lucid.session(), url, {
			query: { preset: IMAGE_PRESET.name },
		});

		await deletePermanently(admin, id);
		const stored = await listStoredKeys(lucid.uploads);

		//* variants are named after the file, so nothing on disk carries its name
		const name = key.slice(key.indexOf("/") + 1);
		expect(stored.filter((file) => file.includes(name))).toEqual([]);
		expect(await countVariants(lucid, key)).toBe(0);
		expect(await readStorageCounter(lucid)).toBe(await sumStoredSizes(lucid));
	});
});

describe("expiring media", () => {
	requires("plugin:filesystem", "mode:host");

	test("media left in the bin past its retention is deleted for good", async ({
		lucid,
	}) => {
		const admin = await signInAdmin(lucid);
		const kept = await uploadMedia(admin, { title: "Recently binned" });
		const expired = await uploadMedia(admin, { title: "Long binned" });
		const expiredKey = (await getMedia(admin, expired)).key;
		await binMedia(admin, expired);

		advanceClock(31 * DAY);
		const later = await signInAdmin(lucid);
		await binMedia(later, kept);
		await runExpiryJob(later);

		expect(
			(await later.request({ path: `/api/v1/media/${expired}` })).status,
		).toBe(404);
		expect(await listedIn(later, [kept], "bin")).toEqual([kept]);
		expect(await listStoredKeys(lucid.uploads)).not.toContain(expiredKey);
	});

	test("files uploaded but never saved as media are removed", async ({
		lucid,
	}) => {
		const admin = await signInAdmin(lucid);
		const key = await uploadFile(admin, files.text("Forgotten\n"));
		expect(await listStoredKeys(lucid.uploads)).toContain(key);

		advanceClock(2 * 60 * 60 * 1000);
		await runExpiryJob(await signInAdmin(lucid));

		expect(await listStoredKeys(lucid.uploads)).not.toContain(key);
	});
});

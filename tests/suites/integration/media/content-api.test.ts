import { describe, expect, type Lucid, requires, test } from "#harness/vitest";
import { createContentReader } from "#shared/documents";
import { files, getMedia, uploadMedia } from "#shared/media";

/** Library, personal and binned media, for checking what a website can see. */
const createMediaOfEachKind = async (lucid: Lucid) => {
	const admin = await lucid.admin();
	const owner = await lucid.user({
		permissions: ["media:create", "media:update"],
	});
	const library = await uploadMedia(admin, {
		title: "Library",
		file: files.png(),
	});
	const personal = await uploadMedia(owner.session, {
		title: "Personal",
		file: files.png(),
		owned: true,
	});
	const binned = await uploadMedia(admin, {
		title: "Binned",
		file: files.png(),
	});
	await admin.request({ method: "DELETE", path: `/api/v1/media/${binned}` });

	return {
		library: await getMedia(admin, library),
		personal: await getMedia(owner.session, personal),
		binned: await getMedia(admin, binned),
	};
};

describe("media in the content API", () => {
	requires("feature:mediaStorage", "harness:outbox");

	test("lists and reads library media only", async ({ lucid }) => {
		const admin = await lucid.admin();
		const media = await createMediaOfEachKind(lucid);
		const read = await createContentReader(
			admin,
			lucid.session,
			[],
			["media:read"],
		);
		const ids = [media.library.id, media.personal.id, media.binned.id];

		const listed = await read<{ data: Array<{ id: number }> }>("media", {
			"filter[id:in]": ids,
		});
		const single = await Promise.all(
			ids.map(async (id) => (await read(`media/${id}`)).status),
		);

		expect(listed.body.data.map((item) => item.id)).toEqual([media.library.id]);
		expect(single).toEqual([200, 404, 404]);
	});

	test("needs an API key that may read media", async ({ lucid }) => {
		const admin = await lucid.admin();
		const id = await uploadMedia(admin, { title: "Hidden" });
		const read = await createContentReader(admin, lucid.session);

		expect((await read(`media/${id}`)).status).toBe(403);
	});

	test("resolves URLs for library media only", async ({ lucid }) => {
		const admin = await lucid.admin();
		const media = await createMediaOfEachKind(lucid);
		const resolve = await createContentReader(
			admin,
			lucid.session,
			[],
			["media:resolve-url"],
		);

		const statuses = await Promise.all(
			[media.library, media.personal, media.binned].map(
				async ({ key }) =>
					(await resolve(`media/resolve/${key}`, {}, {}, {})).status,
			),
		);

		expect(statuses).toEqual([200, 404, 404]);
	});
});

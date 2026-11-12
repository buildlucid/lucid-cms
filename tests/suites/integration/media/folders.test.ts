import {
	describe,
	expect,
	requires,
	type Session,
	test,
} from "#harness/vitest";
import { createFolder, getMedia, uploadMedia } from "#shared/helpers/media";
import { uniqueName } from "#shared/helpers/permissions";

const moveFolder = (session: Session, id: number, parentFolderId: number) =>
	session.request({
		method: "PATCH",
		path: `/api/v1/media/folders/${id}`,
		body: { parentFolderId },
	});

const moveMedia = (session: Session, id: number, folderId: number | null) =>
	session.request({
		method: "PATCH",
		path: `/api/v1/media/${id}/move`,
		body: { folderId },
	});

describe("media folders", () => {
	requires("feature:mediaStorage");

	test("a folder can't be put inside itself or anything inside it", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const parent = await createFolder(admin, uniqueName("Parent"));
		const child = await createFolder(admin, uniqueName("Child"), parent);
		const grandchild = await createFolder(
			admin,
			uniqueName("Grandchild"),
			child,
		);

		expect((await moveFolder(admin, parent, parent)).status).toBe(400);
		expect((await moveFolder(admin, parent, grandchild)).status).toBe(400);
	});

	test("moves media between folders and back to the top", async ({ lucid }) => {
		const admin = await lucid.admin();
		const folder = await createFolder(admin, uniqueName("Destination"));
		const id = await uploadMedia(admin, { title: "Moving" });

		const moved = await moveMedia(admin, id, folder);
		const inFolder = (await getMedia(admin, id)).folderId;
		await moveMedia(admin, id, null);

		expect(moved.status).toBe(204);
		expect(inFolder).toBe(folder);
		expect((await getMedia(admin, id)).folderId).toBeNull();
	});

	test("deleting a folder moves its media to the top and removes its subfolders", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const parent = await createFolder(admin, uniqueName("Parent"));
		const child = await createFolder(admin, uniqueName("Child"), parent);
		const inChild = await uploadMedia(admin, {
			title: "In child",
			folderId: child,
		});

		const deleted = await admin.request({
			method: "DELETE",
			path: `/api/v1/media/folders/${parent}`,
		});
		const hierarchy = await admin.request<{ data: Array<{ id: number }> }>({
			path: "/api/v1/media/folders/hierarchy",
		});

		expect(deleted.status).toBeLessThan(300);
		expect((await getMedia(admin, inChild)).folderId).toBeNull();
		expect(JSON.stringify(hierarchy.body)).not.toContain(`"id":${child},`);
	});

	describe("with another person", () => {
		requires("harness:outbox");

		test("personal media can't be filed in a folder", async ({ lucid }) => {
			const owner = await lucid.user({
				permissions: ["media:create", "media:update"],
			});
			const admin = await lucid.admin();
			const folder = await createFolder(admin, uniqueName("Library only"));
			const id = await uploadMedia(owner.session, {
				title: "Personal",
				owned: true,
			});

			const moved = await moveMedia(owner.session, id, folder);

			expect(moved.status).toBe(400);
			expect((await getMedia(owner.session, id)).folderId).toBeNull();
		});
	});
});

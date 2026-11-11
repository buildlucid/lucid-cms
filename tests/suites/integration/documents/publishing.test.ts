import { describe, expect, requires, test } from "#harness/vitest";
import { STORY_KEY } from "#shared/collections/story";
import {
	createDocument,
	publishDocument,
	readDocument,
	saveDocument,
} from "#shared/documents";

const titled = (title: string) => ({
	fields: [{ key: "title", type: "text", value: title }],
});

describe("publishing documents", () => {
	requires(`collection:${STORY_KEY}`);

	test("publishes the latest content to an environment", async ({ lucid }) => {
		const admin = await lucid.admin();
		const id = await createDocument(admin, STORY_KEY, titled("Ready"));
		expect(
			(await readDocument(admin, STORY_KEY, id)).versions.staging,
		).toBeNull();

		await publishDocument(admin, STORY_KEY, id, "staging");

		const latest = await readDocument(admin, STORY_KEY, id);
		const staging = await readDocument(admin, STORY_KEY, id, "staging");
		expect(staging.fields.title).toBe("Ready");
		expect(staging.contentId).toBe(latest.contentId);
		expect(staging.versionId).not.toBe(latest.versionId);
		expect(latest.versions.production).toBeNull();
	});

	test("keeps published content as it was while latest is edited", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const id = await createDocument(admin, STORY_KEY, titled("Published"));
		await publishDocument(admin, STORY_KEY, id, "staging");

		await saveDocument(admin, STORY_KEY, id, titled("Draft"));

		expect(
			(await readDocument(admin, STORY_KEY, id, "staging")).fields.title,
		).toBe("Published");

		await publishDocument(admin, STORY_KEY, id, "staging");
		expect(
			(await readDocument(admin, STORY_KEY, id, "staging")).fields.title,
		).toBe("Draft");
	});

	test("needs the same content in staging before it reaches production", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const id = await createDocument(admin, STORY_KEY, titled("Staged"));
		const toProduction = () =>
			admin.request({
				method: "POST",
				path: `/api/v1/documents/${STORY_KEY}/${id}/publish`,
				body: { environment: "production" },
			});

		expect((await toProduction()).status).toBe(409);

		await publishDocument(admin, STORY_KEY, id, "staging");
		expect((await toProduction()).status).toBe(204);

		//* staging holds the old content again, so the new content cannot skip it
		await saveDocument(admin, STORY_KEY, id, titled("Changed"));
		expect((await toProduction()).status).toBe(409);
		expect(
			(await readDocument(admin, STORY_KEY, id, "production")).fields.title,
		).toBe("Staged");
	});

	test("unpublishes from one environment and leaves the others", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const id = await createDocument(admin, STORY_KEY, titled("Live"));
		await publishDocument(admin, STORY_KEY, id, "staging");
		await publishDocument(admin, STORY_KEY, id, "production");

		const unpublished = await admin.request({
			method: "POST",
			path: `/api/v1/documents/${STORY_KEY}/${id}/unpublish`,
			body: { environment: "production" },
		});

		expect(unpublished.status).toBe(204);
		const { versions } = await readDocument(admin, STORY_KEY, id);
		expect(versions.production).toBeNull();
		expect(versions.staging).not.toBeNull();
		expect(
			(
				await admin.request({
					path: `/api/v1/documents/${STORY_KEY}/${id}/production`,
				})
			).status,
		).toBe(404);
	});

	test("refuses an environment the collection does not have", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const id = await createDocument(admin, STORY_KEY, titled("Nowhere"));

		const published = await admin.request({
			method: "POST",
			path: `/api/v1/documents/${STORY_KEY}/${id}/publish`,
			body: { environment: "preview" },
		});

		expect(published.status).toBe(400);
	});
});

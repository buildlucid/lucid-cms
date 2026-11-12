import { describe, expect, requires, test } from "#harness/vitest";
import { REVIEWED_STORY_KEY } from "#shared/collections/reviewed-story";
import { STORY_KEY } from "#shared/collections/story";
import {
	createDocument,
	publishDocument,
	readDocument,
} from "#shared/documents";
import {
	acknowledgeTarget,
	approve,
	approveAndCompleteRequest,
	blockerCodes,
	createThroughRequest,
	onlyDocument,
	openRequest,
	readRequest,
	requestChange,
} from "#shared/requests";

const titled = (title: string) => ({
	fields: [{ key: "title", type: "text", value: title }],
});

describe("requests for documents in the bin", () => {
	requires(`collection:${STORY_KEY}`);

	test("blocks a request while its document is in the bin, and carries on once it is restored", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const id = await createDocument(admin, STORY_KEY, titled("Binned"));
		const requestId = await openRequest(admin, "publish", [
			{ collectionKey: STORY_KEY, documentId: id, targets: ["staging"] },
		]);

		const binned = await admin.request({
			method: "DELETE",
			path: `/api/v1/documents/${STORY_KEY}/${id}`,
		});
		expect(binned.status).toBe(204);
		const blocked = await readRequest(admin, requestId);
		expect(blockerCodes(blocked)).toEqual(["document_deleted"]);
		expect(onlyDocument(blocked).deleted).toBe("bin");
		expect((await approve(admin, requestId)).status).toBe(409);

		const restored = await admin.request({
			method: "POST",
			path: `/api/v1/documents/${STORY_KEY}/restore`,
			body: { ids: [id] },
		});
		expect(restored.status).toBe(204);
		expect(blockerCodes(await readRequest(admin, requestId))).toEqual([]);
		await approveAndCompleteRequest(admin, requestId);
		expect(
			(await readDocument(admin, STORY_KEY, id, "staging")).fields.title,
		).toBe("Binned");
	});
});

describe("delete and unpublish requests", () => {
	requires(`collection:${REVIEWED_STORY_KEY}`);

	test("blocks a second delete request once the first moves the document to the bin", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const id = await createThroughRequest(
			admin,
			REVIEWED_STORY_KEY,
			titled("Deleted twice"),
		);
		const documents = [{ collectionKey: REVIEWED_STORY_KEY, documentId: id }];
		const first = await openRequest(admin, "delete", documents);
		const second = await openRequest(admin, "delete", documents);

		await approveAndCompleteRequest(admin, first);

		expect((await readDocument(admin, REVIEWED_STORY_KEY, id)).isDeleted).toBe(
			true,
		);
		expect(blockerCodes(await readRequest(admin, second))).toEqual([
			"document_deleted",
		]);
		expect((await approve(admin, second)).status).toBe(409);
	});

	test("unpublishes only environments that hold the document, and flags requests that publish there", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const id = await createThroughRequest(
			admin,
			REVIEWED_STORY_KEY,
			titled("Taken down"),
		);
		await publishDocument(admin, REVIEWED_STORY_KEY, id, "staging");
		const story = (targets: string[]) => [
			{ collectionKey: REVIEWED_STORY_KEY, documentId: id, targets },
		];

		expect(
			(await requestChange(admin, "unpublish", story(["production"]))).status,
		).toBe(400);
		expect(
			(await requestChange(admin, "unpublish", story(["latest"]))).status,
		).toBe(400);

		const publishing = await openRequest(admin, "publish", story(["staging"]));
		const unpublishing = await openRequest(
			admin,
			"unpublish",
			story(["staging"]),
		);
		await approveAndCompleteRequest(admin, unpublishing);

		expect(
			(await readDocument(admin, REVIEWED_STORY_KEY, id)).versions.staging,
		).toBeNull();
		const flagged = await readRequest(admin, publishing);
		expect(flagged.events.map((event) => event.type)).toContain(
			"target_unpublished",
		);
		expect(blockerCodes(flagged)).toEqual(["acknowledge_required"]);
	});

	test("asks to acknowledge an environment someone else emptied, then completes an unpublish request with nothing left to remove", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const id = await createThroughRequest(
			admin,
			REVIEWED_STORY_KEY,
			titled("Already down"),
		);
		await publishDocument(admin, REVIEWED_STORY_KEY, id, "staging");
		const story = [
			{
				collectionKey: REVIEWED_STORY_KEY,
				documentId: id,
				targets: ["staging"],
			},
		];
		const first = await openRequest(admin, "unpublish", story);
		const second = await openRequest(admin, "unpublish", story);
		expect((await approve(admin, second)).status).toBe(204);

		await approveAndCompleteRequest(admin, first);

		const flagged = await readRequest(admin, second);
		expect(flagged.approved).toBe(false);
		expect(blockerCodes(flagged)).toEqual(["acknowledge_required"]);
		expect(
			(
				await acknowledgeTarget(
					admin,
					second,
					onlyDocument(flagged).id,
					"staging",
				)
			).status,
		).toBe(204);
		await approveAndCompleteRequest(admin, second);
		expect((await readRequest(admin, second)).status).toBe("completed");
	});
});

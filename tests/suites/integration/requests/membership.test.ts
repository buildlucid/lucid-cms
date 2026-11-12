import { describe, expect, requires, test } from "#harness/vitest";
import { REVIEWED_STORY_KEY } from "#shared/config/collections/reviewed-story";
import { STORY_KEY } from "#shared/config/collections/story";
import { TEAM_STORY_KEY } from "#shared/config/collections/team-story";
import {
	createDocument,
	readDocument,
	titled,
} from "#shared/helpers/documents";
import {
	approve,
	completeRequest,
	createThroughRequest,
	createWithTeam,
	openRequest,
	readRequest,
	requestTeam,
	reviewerPermissions,
} from "#shared/helpers/requests";

describe("the documents in a request", () => {
	requires(`collection:${STORY_KEY}`);

	test("adds and removes documents, refusing duplicates, withdrawing approval and always keeping one", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const [first, second] = [
			await createDocument(admin, STORY_KEY, titled("First")),
			await createDocument(admin, STORY_KEY, titled("Second")),
		];
		const story = (documentId: number) => ({
			collectionKey: STORY_KEY,
			documentId,
			source: "latest",
			targets: ["staging"],
		});
		const requestId = await openRequest(admin, "publish", [story(first)]);
		const add = (documentId: number) =>
			admin.request({
				method: "POST",
				path: `/api/v1/requests/${requestId}/documents`,
				body: { documents: [story(documentId)] },
			});
		const remove = (requestDocumentId: number) =>
			admin.request({
				method: "DELETE",
				path: `/api/v1/requests/${requestId}/documents/${requestDocumentId}`,
			});
		expect((await approve(admin, requestId)).status).toBe(204);

		expect((await add(first)).status).toBe(409);
		expect((await add(second)).status).toBe(204);
		const added = await readRequest(admin, requestId);
		expect(added.approved).toBe(false);
		expect(added.documents.map((document) => document.documentId)).toEqual([
			first,
			second,
		]);

		const [firstMember, secondMember] = added.documents;
		if (!firstMember || !secondMember) {
			throw new Error("The request should hold both stories.");
		}
		expect((await remove(firstMember.id)).status).toBe(204);
		expect((await remove(secondMember.id)).status).toBe(400);
		expect(
			(await readRequest(admin, requestId)).documents.map(
				(document) => document.documentId,
			),
		).toEqual([second]);
	});
});

describe("requests across collections", () => {
	requires("harness:outbox", `collection:${TEAM_STORY_KEY}`);

	test("needs the most approvals any of its collections asks for, and publishes every document to its own targets", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const team = await requestTeam(lucid, TEAM_STORY_KEY);
		const reviewedId = await createThroughRequest(
			admin,
			REVIEWED_STORY_KEY,
			titled("Reviewed once"),
		);
		const teamId = await createWithTeam(
			team,
			TEAM_STORY_KEY,
			titled("Reviewed twice"),
		);
		const both = await lucid.user({
			permissions: [
				...reviewerPermissions(REVIEWED_STORY_KEY),
				...reviewerPermissions(TEAM_STORY_KEY),
			],
		});

		const requestId = await openRequest(admin, "publish", [
			{
				collectionKey: REVIEWED_STORY_KEY,
				documentId: reviewedId,
				targets: ["production"],
			},
			{
				collectionKey: TEAM_STORY_KEY,
				documentId: teamId,
				targets: ["staging", "production"],
			},
		]);
		expect((await readRequest(admin, requestId)).requiredApprovals).toBe(2);
		//* a reviewer of one collection can't read a request that holds another
		expect(
			(
				await team.reviewer.session.request({
					path: `/api/v1/requests/${requestId}`,
				})
			).status,
		).toBe(404);

		expect((await approve(admin, requestId)).status).toBe(204);
		expect((await readRequest(admin, requestId)).approved).toBe(false);
		expect((await approve(both.session, requestId)).status).toBe(204);
		await completeRequest(both.session, requestId);

		expect(
			(await readDocument(admin, REVIEWED_STORY_KEY, reviewedId, "production"))
				.fields.title,
		).toBe("Reviewed once");
		for (const environment of ["staging", "production"]) {
			expect(
				(await readDocument(admin, TEAM_STORY_KEY, teamId, environment)).fields
					.title,
			).toBe("Reviewed twice");
		}
	});
});

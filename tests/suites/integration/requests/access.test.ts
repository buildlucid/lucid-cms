import {
	describe,
	expect,
	requires,
	type Session,
	test,
} from "#harness/vitest";
import { REVIEWED_STORY_KEY } from "#shared/config/collections/reviewed-story";
import { listDocumentIds, titled } from "#shared/helpers/documents";
import { setRolePermissions } from "#shared/helpers/permissions";
import {
	approve,
	createThroughRequest,
	openCreateRequest,
	openRequest,
	readRequest,
} from "#shared/helpers/requests";

const reviewed = (action: string) =>
	`documents:${REVIEWED_STORY_KEY}:${action}`;

/** The IDs of the requests a session can list. */
const listedRequests = async (session: Session) => {
	const listed = await session.request<{ data: Array<{ id: number }> }>({
		path: "/api/v1/requests",
		query: { perPage: 100 },
	});
	expect(listed.status).toBe(200);
	return listed.body.data.map((request) => request.id);
};

/** Whether a session can list and read a request, which always agree. */
const sees = async (session: Session, requestId: number) => {
	const listed = (await listedRequests(session)).includes(requestId);
	const read = await session.request({ path: `/api/v1/requests/${requestId}` });
	expect(read.status).toBe(listed ? 200 : 404);
	return listed;
};

describe("request access without requests:read", () => {
	requires("harness:outbox", `collection:${REVIEWED_STORY_KEY}`);

	test("people see the requests they make, review or can complete, and nobody else's", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const requester = await lucid.user({
			permissions: [reviewed("read"), reviewed("create-request")],
		});
		const publisher = await lucid.user({
			permissions: [reviewed("read"), reviewed("publish-request")],
		});
		const reviewer = await lucid.user({
			permissions: [reviewed("read"), reviewed("review")],
		});
		const reader = await lucid.user({ permissions: [reviewed("read")] });

		const created = await openCreateRequest(
			requester.session,
			REVIEWED_STORY_KEY,
			{
				title: "Create a requested story",
				...titled("Requested"),
			},
		);
		const storyId = await createThroughRequest(admin, REVIEWED_STORY_KEY, {
			title: "Create a published story",
			...titled("Published"),
		});
		const published = await openRequest(publisher.session, "publish", [
			{
				collectionKey: REVIEWED_STORY_KEY,
				documentId: storyId,
				targets: ["staging"],
			},
		]);

		expect(await sees(requester.session, created.requestId)).toBe(true);
		expect(await sees(requester.session, published)).toBe(false);
		expect(await sees(publisher.session, published)).toBe(true);
		expect(await sees(publisher.session, created.requestId)).toBe(false);
		expect(await sees(reviewer.session, created.requestId)).toBe(true);
		expect(await sees(reviewer.session, published)).toBe(true);
		expect(await sees(reader.session, created.requestId)).toBe(false);
		expect(await sees(reader.session, published)).toBe(false);

		//* the requester edits their own proposal, and the reviewer can approve it
		expect(
			(await readRequest(requester.session, created.requestId)).permissions,
		).toMatchObject({ edit: true, approve: false });
		expect((await approve(reviewer.session, created.requestId)).status).toBe(
			204,
		);

		//* requested documents are listed for the people who can read their requests
		const pending = { "filter[pending]": 1 };
		expect(
			await listDocumentIds(requester.session, REVIEWED_STORY_KEY, pending),
		).toContain(created.id);
		expect(
			await listDocumentIds(publisher.session, REVIEWED_STORY_KEY, pending),
		).not.toContain(created.id);
	});

	test("being asked to review a request lets someone read it", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		const assignee = await lucid.user({
			permissions: [reviewed("read"), reviewed("review")],
		});
		const { requestId } = await openCreateRequest(admin, REVIEWED_STORY_KEY, {
			title: "Create an assigned story",
			reviewerIds: [assignee.id],
			...titled("Assigned"),
		});

		//* a reviewer always reads it, so take review away to show the assignment alone is enough
		await setRolePermissions(admin, assignee.roleId ?? 0, [reviewed("read")]);
		expect(await sees(assignee.session, requestId)).toBe(true);
	});
});

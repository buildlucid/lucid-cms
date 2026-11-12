import { expect, type Page, requires, test } from "#harness/playwright";
import { REVIEWED_STORY_KEY } from "#shared/config/collections/reviewed-story";
import {
	listDocumentIds,
	readDocument,
	titled,
} from "#shared/helpers/documents";
import {
	authorPermissions,
	createThroughRequest,
	readRequest,
	reviewerPermissions,
} from "#shared/helpers/requests";

/** The request a page has open, from its address. */
const requestIdOf = (page: Page) => {
	const id = Number(new URL(page.url()).pathname.split("/").at(-1));
	if (!Number.isInteger(id)) {
		throw new Error(`${page.url()} isn't a request page.`);
	}
	return id;
};

/** Approves the request a page has open, then completes it, as a reviewer does. */
const approveAndComplete = async (page: Page) => {
	await page.getByRole("button", { name: "Approve", exact: true }).click();
	await page
		.getByRole("dialog", { name: "Approve Request" })
		.getByRole("button", { name: "Approve", exact: true })
		.click();
	await page.getByRole("button", { name: "Complete Now", exact: true }).click();
	await page
		.getByRole("alertdialog", { name: "Complete Request" })
		.getByRole("button", { name: "Complete Now", exact: true })
		.click();
};

test.describe("requests in the admin", () => {
	requires("harness:outbox", `collection:${REVIEWED_STORY_KEY}`);
	//* each test invites people, which takes a while when every lane runs at once
	test.slow();

	test("an author requests a new story from the builder, and a reviewer approves and completes it", async ({
		lucid,
		pageAs,
	}) => {
		const admin = await lucid.admin();
		const title = `Requested ${crypto.randomUUID().slice(0, 8)}`;
		const author = await lucid.user({
			permissions: authorPermissions(REVIEWED_STORY_KEY),
		});
		const reviewer = await lucid.user({
			permissions: reviewerPermissions(REVIEWED_STORY_KEY),
		});
		const authorPage = await pageAs(author.session);

		await authorPage.goto(
			`/admin/collections/${REVIEWED_STORY_KEY}/latest/create`,
		);
		await authorPage.getByRole("textbox", { name: "Title" }).fill(title);
		await authorPage
			.getByRole("button", { name: "Request", exact: true })
			.click();
		const requestDialog = authorPage.getByRole("dialog", {
			name: "Request Reviewed story",
		});
		await requestDialog
			.getByRole("textbox", { name: "Request name" })
			.fill(`Create ${title}`);
		await requestDialog.getByRole("button", { name: "Send Request" }).click();
		await expect(authorPage).toHaveURL(/\/admin\/requests\/\d+$/);
		const requestId = requestIdOf(authorPage);
		await expect(
			authorPage.getByRole("heading", { name: `Create ${title}` }),
		).toBeVisible();
		await expect(
			authorPage.getByRole("button", { name: "Approve", exact: true }),
		).toHaveCount(0);

		const reviewerPage = await pageAs(reviewer.session);
		await reviewerPage.goto(`/admin/requests/${requestId}`);
		await approveAndComplete(reviewerPage);

		await expect
			.poll(async () => (await readRequest(admin, requestId)).status)
			.toBe("completed");
		const [id] = await listDocumentIds(admin, REVIEWED_STORY_KEY, {
			"filter[fields.title]": title,
		});
		expect(id).toBeDefined();
	});

	test("a reviewer's comment holds a request until the author resolves it", async ({
		lucid,
		pageAs,
	}) => {
		const admin = await lucid.admin();
		const author = await lucid.user({
			permissions: authorPermissions(REVIEWED_STORY_KEY),
		});
		const reviewer = await lucid.user({
			permissions: reviewerPermissions(REVIEWED_STORY_KEY),
		});
		const requested = await author.session.request<{
			data: { id: number; requestId: number };
		}>({
			method: "POST",
			path: `/api/v1/documents/${REVIEWED_STORY_KEY}/request`,
			body: { title: "Discussed in the browser", ...titled("Discussed") },
		});
		expect(requested.status).toBe(201);
		const { requestId } = requested.body.data;
		const path = `/admin/requests/${requestId}`;

		const reviewerPage = await pageAs(reviewer.session);
		await reviewerPage.goto(path);
		await reviewerPage.getByRole("button", { name: "Leave a comment" }).click();
		await reviewerPage
			.getByRole("textbox", { name: "Leave a comment" })
			.fill("Could the title be clearer?");
		await reviewerPage
			.getByRole("button", { name: "Comment", exact: true })
			.click();
		await expect(
			reviewerPage.getByText("Could the title be clearer?"),
		).toBeVisible();
		await expect(
			reviewerPage.getByRole("button", { name: "Approve", exact: true }),
		).toBeDisabled();

		const authorPage = await pageAs(author.session);
		await authorPage.goto(path);
		await authorPage.getByRole("button", { name: "Comment Status" }).click();
		await authorPage.getByRole("menuitemradio", { name: "Resolved" }).click();
		await expect
			.poll(async () => (await readRequest(admin, requestId)).openComments)
			.toBe(0);

		await reviewerPage.reload();
		await approveAndComplete(reviewerPage);
		await expect
			.poll(async () => (await readRequest(admin, requestId)).status)
			.toBe("completed");
	});

	test("asks for a reviewed environment from the builder's publish menu", async ({
		lucid,
		page,
	}) => {
		const admin = await lucid.admin();
		const id = await createThroughRequest(
			admin,
			REVIEWED_STORY_KEY,
			titled("Going to production"),
		);

		await page.goto(`/admin/collections/${REVIEWED_STORY_KEY}/latest/${id}`);
		await page.getByRole("button", { name: "Publish Options" }).click();
		await page.getByRole("menuitem", { name: "Publish to Production" }).click();
		//* production is reviewed, so the dialog starts on a new request
		const dialog = page.getByRole("dialog", { name: "New Request" });
		await dialog
			.getByRole("textbox", { name: "Request name" })
			.fill("Production launch");
		await dialog
			.getByRole("button", { name: "New Request", exact: true })
			.click();
		await expect(page).toHaveURL(/\/admin\/requests\/\d+$/);

		await approveAndComplete(page);
		await expect
			.poll(async () => {
				const production = (await readDocument(admin, REVIEWED_STORY_KEY, id))
					.versions.production;
				return production !== null;
			})
			.toBe(true);
		expect(
			(await readDocument(admin, REVIEWED_STORY_KEY, id, "production")).fields
				.title,
		).toBe("Going to production");
	});

	test("asks for a story's deletion from the builder, as the collection reviews deleting", async ({
		lucid,
		page,
	}) => {
		const admin = await lucid.admin();
		const id = await createThroughRequest(
			admin,
			REVIEWED_STORY_KEY,
			titled("Going to the bin"),
		);

		await page.goto(`/admin/collections/${REVIEWED_STORY_KEY}/latest/${id}`);
		await page.getByRole("button", { name: "Show Options" }).first().click();
		await page.getByRole("menuitem", { name: "Delete" }).click();
		const dialog = page.getByRole("alertdialog", {
			name: "Request Reviewed story Deletion",
		});
		await dialog
			.getByRole("textbox", { name: "Request name" })
			.fill("Retire the story");
		await dialog
			.getByRole("button", { name: "New Request", exact: true })
			.click();
		await expect(page).toHaveURL(/\/admin\/requests\/\d+$/);
		expect((await readDocument(admin, REVIEWED_STORY_KEY, id)).isDeleted).toBe(
			false,
		);

		await approveAndComplete(page);
		await expect
			.poll(
				async () =>
					(await readDocument(admin, REVIEWED_STORY_KEY, id)).isDeleted,
			)
			.toBe(true);
	});
});

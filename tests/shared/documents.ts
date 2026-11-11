import type {
	ApiRequest,
	ApiResponse,
	Session,
} from "../harness/src/client/types.ts";
import { STORY_KEY } from "./collections/story.ts";

export type FieldInput = {
	key: string;
	type: string;
	value?: unknown;
	groups?: Array<{ ref: string; order: number; fields: FieldInput[] }>;
};

export type BrickInput = {
	ref: string;
	key: string;
	order: number;
	type: "builder" | "fixed";
	fields: FieldInput[];
};

/** What a document is saved with, and the part of a document response that holds its content. */
export type DocumentInput = {
	fields?: FieldInput[];
	bricks?: BrickInput[] | null;
};

type VersionSummary = { id: number; contentId: string } | null;

type DocumentResponse = {
	data: DocumentInput & {
		id: number;
		versionId: number;
		contentId: string;
		isDeleted: boolean;
		versions: Record<string, VersionSummary>;
	};
};

/** Throws with the response's details when a request a helper relies on fails. */
const expectStatus = (
	action: string,
	response: ApiResponse<unknown>,
	status: number,
) => {
	if (response.status !== status) {
		throw new Error(
			`${action} gave ${response.status}, not ${status}: ${JSON.stringify(response.body)}`,
		);
	}
};

/** Field values by key, with a repeater as the list of its groups' values in order. */
const fieldValues = (fields: FieldInput[]): Record<string, unknown> =>
	Object.fromEntries(
		fields.map((field) => [
			field.key,
			field.groups
				? field.groups
						.toSorted((a, b) => a.order - b.order)
						.map((group) => fieldValues(group.fields))
				: field.value,
		]),
	);

/**
 * Reduces what was sent, or what was read back, to its values alone. Both give the same shape, so
 * a test can compare them: builder bricks in order, and fixed bricks by key.
 */
export const valuesOf = (document: DocumentInput) => {
	const bricks = document.bricks ?? [];

	return {
		fields: fieldValues(document.fields ?? []),
		bricks: bricks
			.filter((brick) => brick.type === "builder")
			.toSorted((a, b) => a.order - b.order)
			.map((brick) => ({ key: brick.key, fields: fieldValues(brick.fields) })),
		fixed: Object.fromEntries(
			bricks
				.filter((brick) => brick.type === "fixed")
				.map((brick) => [brick.key, fieldValues(brick.fields)]),
		),
	};
};

const text = (key: string, value: string): FieldInput => ({
	key,
	type: "text",
	value,
});

/**
 * A story that uses every field type that needs no upload, nested repeaters, and builder and
 * fixed bricks. `marker` goes in an indexed field, so a test can find its own stories in a
 * database it shares.
 */
export const fullStory = (options: {
	title: string;
	marker?: string;
	/** A page to relate the story to. */
	pageId: number;
	userId: number;
	/** How many items its repeater holds. Defaults to 3. */
	items?: number;
	/** How many hero bricks come before its list brick. Defaults to 1. */
	heroes?: number;
}): { fields: FieldInput[]; bricks: BrickInput[] } => ({
	fields: [
		text("title", options.title),
		text("text", options.marker ?? "unmarked"),
		{ key: "textarea", type: "textarea", value: "First line\nSecond line" },
		{
			key: "rich_text",
			type: "rich-text",
			value: {
				type: "doc",
				content: [
					{
						type: "paragraph",
						content: [{ type: "text", text: `About ${options.title}` }],
					},
				],
			},
		},
		{ key: "number", type: "number", value: 42 },
		{ key: "range", type: "range", value: [10, 90] },
		{ key: "checkbox", type: "checkbox", value: false },
		{ key: "select", type: "select", value: "second" },
		{ key: "color", type: "color", value: "#ff0000" },
		{ key: "datetime", type: "datetime", value: "2026-01-02T03:04:05.000Z" },
		{ key: "json", type: "json", value: { list: [1, 2, { deep: null }] } },
		{
			key: "code",
			type: "code",
			value: { language: "typescript", value: "const answer = 42;" },
		},
		{
			key: "link",
			type: "link",
			value: { url: "https://example.com", label: "Example", target: "_blank" },
		},
		{ key: "user", type: "user", value: [options.userId] },
		{
			key: "relation",
			type: "relation",
			value: [{ id: options.pageId, collectionKey: "page" }],
		},
		{
			key: "items",
			type: "repeater",
			groups: Array.from({ length: options.items ?? 3 }, (_, order) => ({
				ref: `item-${order}`,
				order,
				fields: [
					text("item_title", `Item ${order}`),
					{ key: "item_number", type: "number", value: order },
					{
						key: "nested_items",
						type: "repeater",
						groups: [0, 1].map((nested) => ({
							ref: `item-${order}-nested-${nested}`,
							order: nested,
							fields: [text("nested_title", `Item ${order}.${nested}`)],
						})),
					},
				],
			})),
		},
	],
	bricks: [
		...Array.from({ length: options.heroes ?? 1 }, (_, order): BrickInput => ({
			ref: `hero-${order}`,
			key: "story-hero",
			order,
			type: "builder",
			fields: [
				text("heading", `${options.title} hero ${order}`),
				{
					key: "body",
					type: "rich-text",
					value: {
						type: "doc",
						content: [
							{
								type: "paragraph",
								content: [{ type: "text", text: "Hero body" }],
							},
						],
					},
				},
			],
		})),
		{
			ref: "list",
			key: "story-list",
			order: options.heroes ?? 1,
			type: "builder",
			fields: [
				{
					key: "entries",
					type: "repeater",
					groups: ["Alpha", "Beta"].map((label, order) => ({
						ref: `entry-${order}`,
						order,
						fields: [
							text("label", label),
							{ key: "amount", type: "number", value: order + 1 },
						],
					})),
				},
			],
		},
		{
			ref: "seo",
			key: "story-seo",
			order: 0,
			type: "fixed",
			fields: [
				text("meta_title", `${options.title} | Stories`),
				{ key: "meta_description", type: "textarea", value: "A story" },
			],
		},
	],
});

/** Creates a page for stories to relate to, and reads the admin's own ID for user fields. */
export const createStoryTargets = async (admin: Session) => {
	const account = await admin.request<{ data: { id: number } }>({
		path: "/api/v1/account",
	});
	expectStatus("Reading the account", account, 200);

	return {
		pageId: await createDocument(admin, "page", {
			fields: [text("title", "Related page")],
		}),
		userId: account.body.data.id,
	};
};

/** Creates a document that must be accepted, and returns its ID. */
export const createDocument = async (
	session: Session,
	collectionKey: string,
	input: DocumentInput,
): Promise<number> => {
	const created = await session.request<{ data: { id: number } }>({
		method: "POST",
		path: `/api/v1/documents/${collectionKey}`,
		body: input,
	});
	expectStatus(`Creating a ${collectionKey} document`, created, 201);
	return created.body.data.id;
};

/**
 * Saves new content as the document's latest version, which must be accepted. With revisions on,
 * the content it replaces is kept as a revision.
 */
export const saveDocument = async (
	session: Session,
	collectionKey: string,
	id: number,
	input: DocumentInput,
): Promise<void> => {
	const saved = await session.request({
		method: "POST",
		path: `/api/v1/documents/${collectionKey}/${id}`,
		body: input,
	});
	expectStatus(`Saving ${collectionKey} document ${id}`, saved, 200);
};

/**
 * Reads one version of a document, which must exist. `version` is `latest`, an environment or a
 * version ID.
 */
export const readDocument = async (
	session: Session,
	collectionKey: string,
	id: number,
	version: string | number = "latest",
) => {
	const read = await session.request<DocumentResponse>({
		path: `/api/v1/documents/${collectionKey}/${id}/${version}`,
		query: { include: "bricks" },
	});
	expectStatus(`Reading ${collectionKey} document ${id}`, read, 200);

	const { data } = read.body;
	return {
		...valuesOf(data),
		versionId: data.versionId,
		contentId: data.contentId,
		isDeleted: data.isDeleted,
		versions: data.versions,
	};
};

/** Publishes a document's latest content to an environment, which must be accepted. */
export const publishDocument = async (
	session: Session,
	collectionKey: string,
	id: number,
	environment: string,
): Promise<void> => {
	const published = await session.request({
		method: "POST",
		path: `/api/v1/documents/${collectionKey}/${id}/publish`,
		body: { environment },
	});
	expectStatus(`Publishing ${collectionKey} document ${id}`, published, 204);
};

/** Lists the IDs of a version's documents that match a query, in the order the CMS gives them. */
export const listDocumentIds = async (
	session: Session,
	collectionKey: string,
	query: NonNullable<ApiRequest["query"]> = {},
	version = "latest",
): Promise<number[]> => {
	const listed = await session.request<{ data: Array<{ id: number }> }>({
		path: `/api/v1/documents/${collectionKey}/${version}`,
		query: { perPage: 100, ...query },
	});
	expectStatus(`Listing ${collectionKey} documents`, listed, 200);
	return listed.body.data.map((document) => document.id);
};

/**
 * Creates an API key that can read the given collections, and returns a way to send content API
 * requests with it. Each request gets a new visitor, as a website's requests carry no cookies.
 */
export const createContentReader = async (
	admin: Session,
	newSession: () => Session,
	collectionKeys: string[] = [STORY_KEY],
) => {
	const integration = await admin.request<{ data: { apiKey: string } }>({
		method: "POST",
		path: "/api/v1/integrations",
		body: {
			name: `Reader of ${collectionKeys.join(", ")}`,
			scopes: collectionKeys.map((key) => `documents:${key}:read`),
		},
	});
	expectStatus("Creating an API key", integration, 201);
	const { apiKey } = integration.body.data;

	return async <Body = unknown>(
		path: string,
		query: Record<string, string | number> = {},
		/** Extra request headers, such as `cache-control: no-cache` to read past the cache. */
		headers: Record<string, string> = {},
	): Promise<ApiResponse<Body>> => {
		const search = new URLSearchParams(
			Object.entries(query).map(([key, value]) => [key, String(value)]),
		);
		const response = await newSession().fetch(
			`/api/v1/content/${path}?${search}`,
			{ headers: { ...headers, authorization: `Bearer ${apiKey}` } },
		);
		const body = await response.text();

		return {
			status: response.status,
			ok: response.ok,
			body: (body === "" ? null : JSON.parse(body)) as Body,
			headers: response.headers,
		};
	};
};

export type ContentReader = Awaited<ReturnType<typeof createContentReader>>;

/** What the content API returns for one document read with its bricks. */
export type ContentDocument = {
	id: number;
	fields: Record<string, unknown>;
	bricks: Array<{ key: string; fields: Record<string, unknown> }>;
	fixed: Record<string, { fields: Record<string, unknown> }>;
};

/** Reads one document from the content API by ID, or null when the version does not have it. */
export const readContent = async (
	read: ContentReader,
	collectionKey: string,
	id: number,
	version: string,
): Promise<ContentDocument | null> => {
	const response = await read<{ data: ContentDocument }>(
		`document/${collectionKey}`,
		{ version, "filter[id]": id, include: "bricks" },
	);
	if (response.status === 404) {
		return null;
	}
	expectStatus(`Reading ${collectionKey} content ${id}`, response, 200);
	return response.body.data;
};

/**
 * Approves a request and completes it, then waits for its changes to be applied. The collection
 * must allow whoever `session` is to approve it.
 */
export const approveAndCompleteRequest = async (
	session: Session,
	requestId: number,
): Promise<void> => {
	const request = await session.request<{ data: { reviewToken: string } }>({
		path: `/api/v1/requests/${requestId}`,
	});
	expectStatus(`Reading request ${requestId}`, request, 200);

	const approved = await session.request({
		method: "POST",
		path: `/api/v1/requests/${requestId}/approve`,
		body: { ifUnchanged: request.body.data.reviewToken },
	});
	expectStatus(`Approving request ${requestId}`, approved, 204);

	const completed = await session.request({
		method: "POST",
		path: `/api/v1/requests/${requestId}/complete`,
	});
	expectStatus(`Completing request ${requestId}`, completed, 202);

	//* a served CMS applies the request from its queue, so it may not be done yet
	for (let attempt = 0; attempt < 100; attempt++) {
		const execution = await session.request<{
			data: { status: string; error: string | null } | null;
		}>({ path: `/api/v1/requests/${requestId}/execution` });
		expectStatus(`Reading request ${requestId}'s execution`, execution, 200);

		const status = execution.body.data?.status;
		if (status === "completed") {
			return;
		}
		if (status === "failed") {
			throw new Error(
				`Request ${requestId} failed: ${execution.body.data?.error}`,
			);
		}
		await new Promise((resolve) => setTimeout(resolve, 100));
	}
	throw new Error(`Request ${requestId} was not applied in time.`);
};

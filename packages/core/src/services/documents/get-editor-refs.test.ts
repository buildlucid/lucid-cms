import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCollectionPermission } from "../../libs/permission/collection-permissions.js";
import { Permissions } from "../../libs/permission/definitions.js";
import type { Permission } from "../../libs/permission/types.js";
import type { RefTarget } from "../../libs/refs/types.js";

const resolveDocumentRefs = vi.hoisted(() =>
	vi.fn(
		(
			_context: unknown,
			_input: { refTargets: RefTarget[]; [key: string]: unknown },
		) => Promise.resolve({ error: undefined, data: { hydratedRefs: {} } }),
	),
);

vi.mock("./helpers/resolve-document-refs.js", () => ({
	default: resolveDocumentRefs,
}));

vi.mock("../../libs/collection/collections.js", () => ({
	default: {
		getSingle: () =>
			Promise.resolve({ error: undefined, data: { key: "page" } }),
		getAll: () =>
			Promise.resolve({
				error: undefined,
				data: [{ key: "page" }, { key: "blog" }],
			}),
	},
}));

vi.mock(
	"../../libs/collection/schema/runtime/runtime-schema-selectors.js",
	() => ({
		getBricksTableSchema: () => Promise.resolve({ error: undefined, data: [] }),
	}),
);

vi.mock("../../utils/helpers/index.js", () => ({
	getBaseUrl: () => "https://cms.test",
}));

import getEditorRefs from "./get-editor-refs.js";

const context = {
	config: { db: { config: { tableNameByteLimit: null } } },
} as never;

const user = (permissions: Permission[]) => ({
	id: 1,
	username: "editor",
	email: "editor@example.com",
	superAdmin: false,
	permissions,
});

const request = {
	collectionKey: "page",
	documents: [
		{ collectionKey: "page", id: 1 },
		{ collectionKey: "blog", id: 2 },
		{ collectionKey: "missing", id: 3 },
	],
	media: [4],
	users: [5],
	emails: [6],
};

/** The IDs resolveDocumentRefs was asked for, for one resource. */
const asked = (resource: RefTarget["resource"]) =>
	(resolveDocumentRefs.mock.calls[0]?.[1].refTargets ?? [])
		.filter((target) => target.resource === resource)
		.map((target) => target.value);

describe("editor refs", () => {
	beforeEach(() => resolveDocumentRefs.mockClear());

	it("only asks for documents and emails the user could pick", async () => {
		const response = await getEditorRefs(context, {
			...request,
			user: user([getCollectionPermission("page", "read")]),
		});

		expect(response.error).toBeUndefined();
		expect(asked("documents")).toEqual([1]);
		expect(asked("emails")).toEqual([]);
		expect(asked("media")).toEqual([4]);
		expect(resolveDocumentRefs.mock.calls[0]?.[1]).toMatchObject({
			mediaActor: { type: "user", user: { id: 1 } },
			reader: { id: 1 },
		});
	});

	it("includes emails with email:read", async () => {
		await getEditorRefs(context, {
			...request,
			user: user([Permissions.EmailRead]),
		});

		expect(asked("documents")).toEqual([]);
		expect(asked("emails")).toEqual([6]);
	});
});

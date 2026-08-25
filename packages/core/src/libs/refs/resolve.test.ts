import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	documents: vi.fn(),
	media: vi.fn(),
	users: vi.fn(),
}));

import resolveRefs, { selectRefs } from "./resolve.js";

const deferred = () => {
	let resolve!: () => void;
	const promise = new Promise<void>((done) => {
		resolve = done;
	});
	return { promise, resolve };
};

describe("resolveRefs", () => {
	beforeEach(() => vi.clearAllMocks());

	it("resolves each collected resource in parallel and combines the results", async () => {
		const started: string[] = [];
		const documents = deferred();
		const media = deferred();
		const users = deferred();

		mocks.documents.mockImplementation(async () => {
			started.push("documents");
			await documents.promise;
			return { error: undefined, data: { documents: [] } };
		});
		mocks.media.mockImplementation(async () => {
			started.push("media");
			await media.promise;
			return { error: undefined, data: { media: [] } };
		});
		mocks.users.mockImplementation(async () => {
			started.push("users");
			await users.promise;
			return { error: undefined, data: { users: [] } };
		});

		const responsePromise = resolveRefs({
			targets: {
				documents: new Map([["documents", new Set([1])]]),
				media: new Map([["media", new Set([2])]]),
				users: new Map([["users", new Set([3])]]),
			},
			resolvers: {
				documents: mocks.documents,
				media: mocks.media,
				users: mocks.users,
			},
		});

		expect(started).toEqual(["documents", "media", "users"]);
		documents.resolve();
		media.resolve();
		users.resolve();

		await expect(responsePromise).resolves.toEqual({
			error: undefined,
			data: { documents: [], media: [], users: [] },
		});
	});
});

describe("selectRefs", () => {
	it("returns only the requested resource keys", () => {
		const refs = { documents: [], media: [], users: [] };

		expect(selectRefs(refs, ["documents", "users"])).toEqual({
			documents: [],
			users: [],
		});
		expect(selectRefs(refs, null)).toBeUndefined();
	});
});

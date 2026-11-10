import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "@/services/api";
import { createBrickStore } from "../brickStore";

vi.mock("@/services/api", () => ({
	default: {
		documents: {
			getEditorRefsReq: vi.fn(async () => ({ data: {} })),
		},
	},
}));

const flush = () => new Promise((resolve) => setTimeout(resolve));

describe("ref requests", () => {
	beforeEach(() => {
		vi.mocked(api.documents.getEditorRefsReq).mockClear();
	});

	it("sends one request per tick for items the store doesn't hold", async () => {
		const store = createBrickStore();
		store.set("refs", {
			documents: [
				{
					id: 1,
					versionId: 1,
					collectionKey: "page",
					route: null,
					fields: null,
				},
			],
		});

		store.requestRefs({
			collectionKey: "page",
			resource: "media",
			value: [1, 2],
		});
		store.requestRefs({
			collectionKey: "page",
			resource: "media",
			value: [2, 3],
		});
		store.requestRefs({
			collectionKey: "page",
			resource: "documents",
			value: [
				{ id: 1, collectionKey: "page" },
				{ id: 2, collectionKey: "page" },
			],
		});
		await flush();

		expect(api.documents.getEditorRefsReq).toHaveBeenCalledTimes(1);
		expect(api.documents.getEditorRefsReq).toHaveBeenCalledWith({
			collectionKey: "page",
			body: {
				documents: [{ id: 2, collectionKey: "page" }],
				media: [1, 2, 3],
				users: [],
				emails: [],
			},
		});
	});

	it("asks for each item once, even when it comes back missing", async () => {
		const store = createBrickStore();

		store.requestRefs({ collectionKey: "page", resource: "users", value: [7] });
		await flush();
		store.requestRefs({ collectionKey: "page", resource: "users", value: [7] });
		await flush();

		expect(api.documents.getEditorRefsReq).toHaveBeenCalledTimes(1);
	});

	it("splits batches larger than the route takes", async () => {
		const store = createBrickStore();

		store.requestRefs({
			collectionKey: "page",
			resource: "media",
			value: Array.from({ length: 501 }, (_, index) => index + 1),
		});
		await flush();

		expect(api.documents.getEditorRefsReq).toHaveBeenCalledTimes(2);
	});

	it("never fetches for locked panes", async () => {
		const store = createBrickStore();
		store.set("locked", true);

		store.requestRefs({ collectionKey: "page", resource: "media", value: [1] });
		await flush();

		expect(api.documents.getEditorRefsReq).not.toHaveBeenCalled();
	});

	it("starts again after refs load, and drops responses for an earlier load", async () => {
		const store = createBrickStore();
		let respond: (
			value: Awaited<ReturnType<typeof api.documents.getEditorRefsReq>>,
		) => void = () => undefined;
		vi.mocked(api.documents.getEditorRefsReq).mockImplementationOnce(
			() => new Promise((resolve) => (respond = resolve)),
		);

		store.requestRefs({ collectionKey: "page", resource: "users", value: [7] });
		await flush();
		store.get.setRefs({});
		//* an empty list would still land if the late response weren't dropped
		respond({ data: { users: [] } });
		await flush();
		expect(store.get.refs.users).toBeUndefined();

		store.requestRefs({ collectionKey: "page", resource: "users", value: [7] });
		await flush();
		expect(api.documents.getEditorRefsReq).toHaveBeenCalledTimes(2);
	});

	it("asks again for items dropped because the store locked", async () => {
		const store = createBrickStore();

		store.requestRefs({ collectionKey: "page", resource: "users", value: [7] });
		store.set("locked", true);
		await flush();
		store.set("locked", false);
		store.requestRefs({ collectionKey: "page", resource: "users", value: [7] });
		await flush();

		expect(api.documents.getEditorRefsReq).toHaveBeenCalledTimes(1);
	});
});

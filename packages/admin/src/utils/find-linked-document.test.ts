import type { Collection, InternalCollectionDocument } from "@types";
import { afterEach, describe, expect, test, vi } from "vitest";
import { findLinkedDocument } from "./find-linked-document";

const { getMultipleReq } = vi.hoisted(() => ({ getMultipleReq: vi.fn() }));
vi.mock("@/services/api/documents/useGetMultiple", () => ({ getMultipleReq }));

const collection = (key: string, routing: Collection["routing"]) =>
	({ key, routing }) as Collection;

const page = {
	id: 4,
	collectionKey: "page",
	route: { path: { en: "/en/about", fr: "/fr/a-propos" }, label: "About" },
} as unknown as InternalCollectionDocument;

afterEach(() => {
	getMultipleReq.mockReset();
});

describe("findLinkedDocument", () => {
	test("finds the routed document a link goes to, in the locale its path belongs to", async () => {
		getMultipleReq.mockImplementation(async ({ collectionKey }) => ({
			data: collectionKey === "page" ? [page] : [],
		}));

		const linked = await findLinkedDocument({
			url: new URL("https://site.example/docs/fr/a-propos/"),
			siteUrl: "https://site.example/docs",
			collections: [
				collection("settings", null),
				collection("blog", { field: "path" }),
				collection("page", { field: "path" }),
			],
		});

		expect(linked).toMatchObject({ document: page, locale: "fr" });
		expect(getMultipleReq).toHaveBeenCalledTimes(2);
		expect(getMultipleReq).toHaveBeenCalledWith(
			expect.objectContaining({
				collectionKey: "page",
				query: {
					filters: { "_path:in": ["/fr/a-propos", "/fr/a-propos/"] },
					perPage: 1,
				},
			}),
		);
	});

	test("finds nothing when no document has the path, or the lookup fails", async () => {
		getMultipleReq.mockRejectedValueOnce(new Error("Forbidden"));
		getMultipleReq.mockResolvedValueOnce({ data: [] });

		expect(
			await findLinkedDocument({
				url: new URL("https://site.example/contact"),
				siteUrl: null,
				collections: [
					collection("page", { field: "path" }),
					collection("blog", { field: "path" }),
				],
			}),
		).toBeNull();
	});
});

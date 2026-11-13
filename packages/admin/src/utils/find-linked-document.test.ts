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
			siteUrls: {},
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
					filters: { "fields.path:in": ["/fr/a-propos", "/fr/a-propos/"] },
					perPage: 1,
				},
			}),
		);
	});

	test("picks the locale whose website the link is on when locales share the path", async () => {
		const contact = {
			...page,
			route: { path: { en: "/contact", fr: "/contact" }, label: "Contact" },
		} as unknown as InternalCollectionDocument;
		getMultipleReq.mockResolvedValue({ data: [contact] });
		const lookUp = (href: string) =>
			findLinkedDocument({
				url: new URL(href),
				siteUrl: "https://example.com/",
				siteUrls: { en: "https://example.com/", fr: "https://example.fr/" },
				collections: [collection("page", { field: "path" })],
			});

		expect(await lookUp("https://example.fr/contact")).toMatchObject({
			locale: "fr",
		});
		expect(await lookUp("https://example.com/contact")).toMatchObject({
			locale: "en",
		});
		//* on neither website, the first locale with the path
		expect(await lookUp("https://other.example/contact")).toMatchObject({
			locale: "en",
		});
	});

	test("picks the document with the path in the locale of the website the link is on", async () => {
		const contact = {
			...page,
			id: 5,
			route: { path: { en: "/contact", fr: "/nous" }, label: "Contact" },
		} as unknown as InternalCollectionDocument;
		const team = {
			...page,
			id: 6,
			route: { path: { en: "/team", fr: "/contact" }, label: "Team" },
		} as unknown as InternalCollectionDocument;
		getMultipleReq.mockResolvedValue({ data: [contact, team] });
		const lookUp = (href: string) =>
			findLinkedDocument({
				url: new URL(href),
				siteUrl: "https://example.com/",
				siteUrls: { en: "https://example.com/", fr: "https://example.fr/" },
				collections: [collection("page", { field: "path" })],
			});

		expect(await lookUp("https://example.fr/contact")).toMatchObject({
			document: team,
			locale: "fr",
		});
		expect(await lookUp("https://example.com/contact")).toMatchObject({
			document: contact,
			locale: "en",
		});
		//* one candidate per locale, as the endpoint matches the path in any locale
		expect(getMultipleReq).toHaveBeenCalledWith(
			expect.objectContaining({
				query: expect.objectContaining({ perPage: 2 }),
			}),
		);
	});

	test("looks a link up below the base path of the website it's on", async () => {
		getMultipleReq.mockResolvedValue({ data: [] });

		await findLinkedDocument({
			url: new URL("https://example.fr/docs/contact"),
			siteUrl: "https://example.com/docs",
			siteUrls: {
				en: "https://example.com/docs",
				fr: "https://example.fr/docs",
			},
			collections: [collection("page", { field: "path" })],
		});

		expect(getMultipleReq).toHaveBeenCalledWith(
			expect.objectContaining({
				query: expect.objectContaining({
					filters: { "fields.path:in": ["/contact", "/contact/"] },
				}),
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
				siteUrls: {},
				collections: [
					collection("page", { field: "path" }),
					collection("blog", { field: "path" }),
				],
			}),
		).toBeNull();
	});
});

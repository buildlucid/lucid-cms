import { logger } from "@lucidcms/core";
import { createServiceContext } from "@lucidcms/core/runtime";
import { SQLiteAdapter } from "@lucidcms/sqlite";
import {
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	test,
	vi,
} from "vitest";
import { indexNow } from "../../constants.js";
import migration from "../../migrations/1789100000000-seo-index-now.js";
import parsePluginOptions from "../parse-plugin-options.js";
import getStatus from "./get-status.js";
import markChanges from "./mark-changes.js";
import recordSend from "./record-send.js";
import sendChanges from "./send-changes.js";
import type { IndexNowTables } from "./tables.js";

const mocks = vi.hoisted(() => ({ getListedUrls: vi.fn() }));

//* the listed pages come straight from the sitemap's services, which have their own tests
vi.mock("./get-listed-urls.js", () => ({ default: mocks.getListedUrls }));

const adapter = new SQLiteAdapter({ database: ":memory:" });
const database = await adapter.connect();
const db = database.client.$extendTables<IndexNowTables>();
const context = createServiceContext({
	config: { db: adapter, translations: { defaultLocale: "en" } } as never,
	database,
	translationStore: {} as never,
});

const options = parsePluginOptions({ collections: [{ key: "page" }] });
const send = () =>
	sendChanges(context, {
		options,
		indexNow: { key: "test-key-1234", endpoint: "https://indexnow.test/send" },
	});

/** Lists these pages, keyed by URL with their `lastModified`, on the next mark. */
const list = (pages: Record<string, string | null>) =>
	mocks.getListedUrls.mockResolvedValueOnce({
		error: undefined,
		data: new Map(Object.entries(pages)),
	});

const fetchMock = vi.fn<typeof fetch>();
/** Each POST's body, in order. */
const posted = () =>
	fetchMock.mock.calls.map(([, init]) => JSON.parse(String(init?.body)));
const postedUrls = () => posted().map((body) => body.urlList);
/** The stored URL rows, with booleans read the same on every database. */
const rows = async () => {
	const stored = await db
		.selectFrom(indexNow.urlsTable)
		.select(["url", "last_modified", "listed", "pending", "revision"])
		.orderBy("url")
		.execute();
	return stored.map((row) => ({
		url: row.url,
		lastModified: row.last_modified,
		listed: Boolean(row.listed),
		pending: Boolean(row.pending),
		revision: Number(row.revision),
	}));
};

beforeAll(async () => {
	await migration.up({ context, toolkit: {} as never });
});

beforeEach(async () => {
	vi.stubGlobal("fetch", fetchMock);
	fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
	await db.deleteFrom(indexNow.urlsTable).execute();
	await db
		.updateTable(indexNow.stateTable)
		.set({ last_sent_at: null, last_url_count: null, revision: 0 })
		.execute();
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.clearAllMocks();
});

describe("markChanges", () => {
	test("marks new, changed and removed pages pending, and leaves unchanged ones alone", async () => {
		list({
			"https://example.com/": "2026-11-01T10:00:00.000Z",
			"https://example.com/about": null,
			"https://example.com/old": null,
		});
		await send();
		list({
			"https://example.com/": "2026-11-01T10:00:00.000Z",
			"https://example.com/about": "2026-11-02T10:00:00.000Z",
			"https://example.com/new": null,
		});

		const revision = await markChanges(context, { options });

		expect(revision.data).toBe(2);
		expect(await rows()).toEqual([
			{
				url: "https://example.com/",
				lastModified: "2026-11-01T10:00:00.000Z",
				listed: true,
				pending: false,
				revision: 1,
			},
			{
				url: "https://example.com/about",
				lastModified: "2026-11-02T10:00:00.000Z",
				listed: true,
				pending: true,
				revision: 2,
			},
			{
				url: "https://example.com/new",
				lastModified: null,
				listed: true,
				pending: true,
				revision: 2,
			},
			{
				url: "https://example.com/old",
				lastModified: null,
				listed: false,
				pending: true,
				revision: 2,
			},
		]);
	});
});

describe("recordSend", () => {
	test("keeps the newer send when one that finished earlier records after it", async () => {
		const newer = { sentAt: "2026-11-13T10:00:01.000Z", urlCount: 2 };
		await recordSend(context, newer);
		await recordSend(context, {
			sentAt: "2026-11-13T10:00:00.000Z",
			urlCount: 5,
		});

		expect((await getStatus(context)).data?.lastSend).toEqual(newer);
	});
});

describe("sendChanges", () => {
	test("clears accepted pages, removes unlisted ones once sent, and records the send", async () => {
		list({ "https://example.com/": null, "https://example.com/old": null });
		await send();
		list({ "https://example.com/": null });
		await send();
		list({ "https://example.com/": null });
		const unchanged = await send();

		expect(postedUrls()).toEqual([
			["https://example.com/", "https://example.com/old"],
			["https://example.com/old"],
		]);
		expect(posted()[0]).toEqual({
			host: "example.com",
			key: "test-key-1234",
			keyLocation: "https://example.com/test-key-1234.txt",
			urlList: expect.any(Array),
		});
		expect(unchanged.data).toEqual({ urlCount: 0 });
		expect(await rows()).toEqual([
			expect.objectContaining({ url: "https://example.com/", pending: false }),
		]);
		expect((await getStatus(context)).data).toEqual({
			pending: 0,
			lastSend: { sentAt: expect.any(String), urlCount: 1 },
		});
	});

	test("keeps pages pending when the response is lost, and the next send still sends a page deleted since", async () => {
		fetchMock.mockRejectedValueOnce(new Error("socket hang up"));
		list({ "https://example.com/new": null });

		const lost = await send();
		expect(lost.error?.status).toBe(503);
		expect((await getStatus(context)).data?.pending).toBe(1);

		//* the page is deleted before the retry
		list({});
		await send();

		expect(postedUrls()).toEqual([
			["https://example.com/new"],
			["https://example.com/new"],
		]);
		expect(await rows()).toEqual([]);
	});

	test("keeps a page pending when it changes again while it's being sent", async () => {
		let accept = () => {};
		fetchMock.mockImplementationOnce(
			() =>
				new Promise((resolve) => {
					accept = () => resolve(new Response(null, { status: 200 }));
				}),
		);
		list({ "https://example.com/": null });
		const first = send();
		await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

		list({ "https://example.com/": "2026-11-02T10:00:00.000Z" });
		await markChanges(context, { options });
		accept();
		await first;

		expect(await rows()).toEqual([
			expect.objectContaining({ pending: true, revision: 2 }),
		]);
		list({ "https://example.com/": "2026-11-02T10:00:00.000Z" });
		await send();
		expect(postedUrls()).toEqual([
			["https://example.com/"],
			["https://example.com/"],
		]);
		expect((await getStatus(context)).data?.pending).toBe(0);
	});

	test("skips the rest of an origin IndexNow rejects, keeping its pages pending", async () => {
		const logged = vi.spyOn(logger, "error").mockImplementation(() => {});
		fetchMock.mockImplementation(async (_url, init) => {
			const { host } = JSON.parse(String(init?.body));
			return new Response(null, { status: host === "example.com" ? 403 : 200 });
		});
		list({
			...Object.fromEntries(
				Array.from({ length: indexNow.batchSize + 1 }, (_, index) => [
					`https://example.com/${index}`,
					null,
				]),
			),
			"https://example.fr/": null,
		});

		const result = await send();

		expect(result.data).toEqual({ urlCount: 1 });
		expect(posted().map((body) => [body.host, body.urlList.length])).toEqual([
			["example.com", indexNow.batchSize],
			["example.fr", 1],
		]);
		expect(logged).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ status: 403 }),
			}),
		);
		expect((await getStatus(context)).data?.pending).toBe(
			indexNow.batchSize + 1,
		);
	});

	test("fails on too many requests, and the retry sends only what is left", async () => {
		fetchMock.mockImplementation(async (_url, init) => {
			const { host } = JSON.parse(String(init?.body));
			return new Response(null, { status: host === "example.de" ? 429 : 202 });
		});
		const pages = { "https://example.com/": null, "https://example.de/": null };
		list(pages);

		const result = await send();
		expect(result.error?.status).toBe(503);

		fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
		list(pages);
		await send();

		expect(postedUrls()).toEqual([
			["https://example.com/"],
			["https://example.de/"],
			["https://example.de/"],
		]);
		expect((await getStatus(context)).data?.pending).toBe(0);
	});

	test("never stores or sends pages on local hosts", async () => {
		list({
			"http://localhost:6543/": null,
			"http://site.localhost/": null,
			"https://example.com/": null,
		});

		await send();

		expect(posted().map((body) => body.host)).toEqual(["example.com"]);
		expect((await rows()).map((row) => row.url)).toEqual([
			"https://example.com/",
		]);
	});
});

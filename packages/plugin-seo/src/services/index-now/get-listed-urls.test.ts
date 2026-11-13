import { describe, expect, test, vi } from "vitest";
import parsePluginOptions from "../parse-plugin-options.js";
import getListedUrls from "./get-listed-urls.js";

const mocks = vi.hoisted(() => ({ getSitemapEntries: vi.fn() }));

//* entries come straight from the sitemap's services, which have their own tests
vi.mock("../sitemap/get-sitemap-entries.js", () => ({
	default: mocks.getSitemapEntries,
}));
vi.mock("../resolve-site-urls.js", () => ({ default: () => ({}) }));

describe("getListedUrls", () => {
	test("keeps the newest known date for a URL listed more than once", async () => {
		const older = "2026-11-01T10:00:00.000Z";
		const newer = "2026-11-02T10:00:00.000Z";
		mocks.getSitemapEntries.mockResolvedValueOnce({
			error: undefined,
			data: [
				{ url: "https://example.com/a", lastModified: newer },
				{ url: "https://example.com/a", lastModified: null },
				{ url: "https://example.com/a", lastModified: older },
				{ url: "https://example.com/b", lastModified: null },
				{ url: "https://example.com/b", lastModified: older },
			],
		});

		const result = await getListedUrls({ config: {} } as never, {
			options: parsePluginOptions({ collections: [{ key: "page" }] }),
		});

		expect(result.data).toEqual(
			new Map([
				["https://example.com/a", newer],
				["https://example.com/b", older],
			]),
		);
	});
});

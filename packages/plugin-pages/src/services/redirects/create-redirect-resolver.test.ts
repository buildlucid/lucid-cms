import { afterEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	findPageAtPath: vi.fn(),
	findStoredRedirect: vi.fn(),
	findPathHistoryRedirect: vi.fn(),
}));

vi.mock("./find-page-at-path.js", () => ({ default: mocks.findPageAtPath }));
vi.mock("./find-stored-redirect.js", () => ({
	default: mocks.findStoredRedirect,
}));
vi.mock("./find-path-history-redirect.js", () => ({
	default: mocks.findPathHistoryRedirect,
}));

import type { RedirectsConfig } from "../../types/types.js";
import createRedirectResolver from "./create-redirect-resolver.js";

const config: RedirectsConfig = {
	collections: [{ key: "page", localized: false }],
	environments: [],
	locales: [],
	defaultLocale: null,
	hasLocaleField: false,
	trackPathChanges: true,
};
const lookup = { path: "/About/", environment: "production" };
const context = {} as never;

describe("pages redirect resolver", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	test("never redirects a path a page uses", async () => {
		mocks.findPageAtPath.mockResolvedValue({ error: undefined, data: true });

		const result = await createRedirectResolver(config)(context, lookup);

		expect(result).toEqual({ error: undefined, data: null });
		expect(mocks.findPageAtPath).toHaveBeenCalledWith(context, {
			collections: [{ key: "page", localized: false }],
			path: "/about",
			environment: "production",
		});
		expect(mocks.findStoredRedirect).not.toHaveBeenCalled();
	});

	test("prefers editors' redirects over old paths", async () => {
		mocks.findPageAtPath.mockResolvedValue({ error: undefined, data: false });
		mocks.findStoredRedirect.mockResolvedValue({
			error: undefined,
			data: { location: "/team", status: 302 },
		});

		const result = await createRedirectResolver(config)(context, lookup);

		expect(result.data).toEqual({ location: "/team", status: 302 });
		expect(mocks.findPathHistoryRedirect).not.toHaveBeenCalled();
	});

	test("skips old paths when path changes aren't tracked", async () => {
		mocks.findPageAtPath.mockResolvedValue({ error: undefined, data: false });
		mocks.findStoredRedirect.mockResolvedValue({
			error: undefined,
			data: null,
		});

		const result = await createRedirectResolver({
			...config,
			trackPathChanges: false,
		})(context, lookup);

		expect(result).toEqual({ error: undefined, data: null });
		expect(mocks.findPathHistoryRedirect).not.toHaveBeenCalled();
	});
});

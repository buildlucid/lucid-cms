import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LucidError } from "./error-handling";
import { getFieldError } from "./get-field-error";
import { adminRequest, getFetchURL } from "./request";

const csrf = vi.hoisted(() => ({
	get: vi.fn(async () => "csrf-token"),
	clear: vi.fn(),
}));
const refresh = vi.hoisted(() => vi.fn(async () => true));
vi.mock("@/services/api/auth/useCsrf", () => ({
	csrfReq: csrf.get,
	clearCsrfSession: csrf.clear,
}));
vi.mock("@/services/api/auth/useRefreshToken", () => ({
	refreshTokenReq: refresh,
}));
vi.mock("@/utils/spawn-toast", () => ({ default: vi.fn() }));
const fetchMock = vi.fn<typeof fetch>();
beforeEach(() => {
	vi.stubGlobal("fetch", fetchMock);
	vi.clearAllMocks();
});
afterEach(() => vi.unstubAllGlobals());
const json = (value: unknown, status = 200) =>
	new Response(JSON.stringify(value), { status });

describe("public request", () => {
	it("retains JSON returned with 201 and infers parsed results", async () => {
		fetchMock.mockResolvedValueOnce(json({ id: 7 }, 201));
		const result = await adminRequest({
			url: "/api/plugin",
			method: "POST",
			body: false,
			parse: (data) => {
				if (
					!data ||
					typeof data !== "object" ||
					!("id" in data) ||
					typeof data.id !== "number"
				)
					throw Error("Invalid response");
				return data.id;
			},
		});
		expect(result).toBe(7);
		expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
			body: "false",
			credentials: "include",
			headers: { "X-CSRF-Token": "csrf-token" },
		});
	});
	it("accepts empty success responses and rejects malformed successful JSON", async () => {
		fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
		await expect(adminRequest({ url: "/api/plugin" })).resolves.toBeUndefined();
		fetchMock.mockResolvedValueOnce(new Response("<html>"));
		await expect(adminRequest({ url: "/api/plugin" })).rejects.toThrow(
			"invalid JSON",
		);
	});
	it("bounds token and CSRF retries", async () => {
		fetchMock
			.mockResolvedValueOnce(json({ code: "authorisation" }, 401))
			.mockResolvedValueOnce(json({ code: "csrf" }, 403))
			.mockResolvedValueOnce(json({ code: "authorisation" }, 401));
		await expect(
			adminRequest({ url: "/api/plugin", method: "PATCH" }),
		).rejects.toBeInstanceOf(LucidError);
		expect(fetchMock).toHaveBeenCalledTimes(3);
		expect(refresh).toHaveBeenCalledTimes(1);
		expect(csrf.clear).toHaveBeenCalledTimes(1);
	});
	it("preserves validation details and reports non-JSON failures", async () => {
		fetchMock.mockResolvedValueOnce(
			json(
				{ message: "Invalid", errors: { title: { message: "Required" } } },
				422,
			),
		);
		const error = await adminRequest({ url: "/api/plugin" }).catch(
			(error) => error,
		);
		expect(getFieldError(error, "title")).toBe("Required");
		fetchMock.mockResolvedValueOnce(
			new Response("Bad gateway", { status: 502, statusText: "Bad Gateway" }),
		);
		await expect(adminRequest({ url: "/api/plugin" })).rejects.toMatchObject({
			errorRes: { status: 502, message: "Bad Gateway" },
		});
	});
	it("does not send aborted or cross-origin requests", async () => {
		const controller = new AbortController();
		controller.abort();
		await expect(
			adminRequest({ url: "/api/plugin", signal: controller.signal }),
		).rejects.toMatchObject({ name: "AbortError" });
		await expect(
			adminRequest({ url: "https://other.example/api" }),
		).rejects.toThrow("current origin");
		expect(fetchMock).not.toHaveBeenCalled();
	});
	it("merges query parameters without losing includes or existing search", () => {
		const url = getFetchURL("/api/plugin?active=1", {
			queryString: "include=fields",
			include: { bricks: true },
			page: 2,
			sort: { title: "desc" },
		});
		const params = new URL(url, "https://example.com").searchParams;
		expect(params.get("include")).toBe("fields,bricks");
		expect(params.get("active")).toBe("1");
		expect(params.get("sort")).toBe("-title");
	});
});

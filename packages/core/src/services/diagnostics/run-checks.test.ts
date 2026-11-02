import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	database: vi.fn(),
	kv: vi.fn(),
	mediaStorage: vi.fn(),
	email: vi.fn(),
}));

vi.mock("./checks/database.js", () => ({ default: mocks.database }));
vi.mock("./checks/kv.js", () => ({ default: mocks.kv }));
vi.mock("./checks/media-storage.js", () => ({ default: mocks.mediaStorage }));
vi.mock("./checks/email.js", () => ({ default: mocks.email }));

import runChecks from "./run-checks.js";

const context = {} as never;
const authUser = { email: "admin@example.com" } as never;

describe("diagnostics run checks", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("maps outcomes to passed, failed and skipped results in the requested order", async () => {
		mocks.kv.mockResolvedValue({
			error: undefined,
			data: {
				adapter: "sqlite",
				steps: [
					{ name: "write", error: null },
					{ name: "read", error: "Value mismatch" },
					{ name: "delete", error: null },
				],
			},
		});
		mocks.mediaStorage.mockResolvedValue({
			error: undefined,
			data: {
				adapter: null,
				steps: [],
				skipped: "No media storage adapter",
			},
		});
		mocks.email.mockResolvedValue({
			error: undefined,
			data: {
				adapter: "smtp",
				steps: [{ name: "send", error: null }],
				message: "Delivered",
			},
		});

		const result = await runChecks(context, {
			checks: ["email", "kv", "mediaStorage"],
			authUser,
		});

		expect(result.error).toBeUndefined();
		expect(result.data).toMatchObject([
			{ key: "email", adapter: "smtp", status: "passed", message: "Delivered" },
			{ key: "kv", status: "failed", message: "Value mismatch" },
			{
				key: "mediaStorage",
				adapter: null,
				status: "skipped",
				message: "No media storage adapter",
			},
		]);
		expect(mocks.database).not.toHaveBeenCalled();
	});

	it("reports a thrown check as failed and keeps running the rest once each", async () => {
		mocks.database.mockRejectedValue(new Error("Connection refused"));
		mocks.kv.mockResolvedValue({
			error: undefined,
			data: {
				adapter: "sqlite",
				steps: [{ name: "write", error: null }],
			},
		});

		const result = await runChecks(context, {
			checks: ["database", "kv", "database"],
			authUser,
		});

		expect(result.data).toMatchObject([
			{
				key: "database",
				adapter: null,
				status: "failed",
				steps: [],
				message: "Connection refused",
			},
			{ key: "kv", status: "passed", message: null },
		]);
		expect(mocks.database).toHaveBeenCalledTimes(1);
	});
});

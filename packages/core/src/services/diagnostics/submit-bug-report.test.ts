import { beforeEach, describe, expect, it, vi } from "vitest";
import packageJson from "../../../package.json" with { type: "json" };

const mocks = vi.hoisted(() => ({
	getAccessToken: vi.fn(),
	submitRemote: vi.fn(),
	handleRemoteError: vi.fn(),
}));

vi.mock("../connection/token-manager.js", () => ({
	default: mocks.getAccessToken,
}));
vi.mock("../../libs/lucid-remote/services/submit-bug-report/index.js", () => ({
	default: mocks.submitRemote,
}));
vi.mock("../connection/helpers/handle-remote-error.js", () => ({
	default: mocks.handleRemoteError,
}));

import submitBugReport from "./submit-bug-report.js";

const context = {} as never;
const report = {
	diagnostics: null,
	page: "/admin/collections/page",
	images: [],
};

describe("submit bug report", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.getAccessToken.mockResolvedValue({
			error: undefined,
			data: { accessToken: "token", lucidRemoteConnectionId: 1 },
		});
		mocks.submitRemote.mockResolvedValue({ error: undefined, data: undefined });
	});

	it("refuses a message without text before calling Lucid", async () => {
		const result = await submitBugReport(context, {
			...report,
			message: { type: "doc", content: [{ type: "paragraph" }] },
		});

		expect(result.error?.status).toBe(400);
		expect(mocks.submitRemote).not.toHaveBeenCalled();
	});

	it("sends the message as HTML with the installed version", async () => {
		const result = await submitBugReport(context, {
			...report,
			message: {
				type: "doc",
				content: [
					{ type: "paragraph", content: [{ type: "text", text: "It broke" }] },
				],
			},
		});

		expect(result.error).toBeUndefined();
		expect(mocks.submitRemote).toHaveBeenCalledWith(context, {
			accessToken: "token",
			report: {
				...report,
				message: "<p>It broke</p>",
				lucidVersion: packageJson.version,
			},
		});
	});
});

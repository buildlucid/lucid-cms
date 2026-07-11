import type { EmailAdapterInstance } from "@lucidcms/core/types";
import type { Transporter } from "nodemailer";
import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	warn: vi.fn(),
}));

vi.mock("@lucidcms/core", () => ({
	logger: {
		warn: mocks.warn,
	},
}));

import plugin from "./plugin.js";

const createTransporter = () =>
	({
		close: vi.fn(),
		sendMail: vi.fn().mockResolvedValue({ messageId: "message-id" }),
		verify: vi.fn().mockResolvedValue(true),
	}) as unknown as Transporter;

const createAdapter = (transporter: Transporter, simulate = false) => {
	const draft = {
		i18n: {
			sources: [] as Array<string | URL>,
		},
		email: {
			simulate,
			adapter: undefined as EmailAdapterInstance | undefined,
		},
	};

	plugin({ transporter }).recipe(draft as never);

	if (!draft.email.adapter) {
		throw new Error("Nodemailer plugin did not register an email adapter.");
	}

	return draft.email.adapter;
};

const runtimeContext = {
	config: {},
	purpose: "runtime",
} as const;

const email = {
	to: "user@example.com",
	subject: "Test email",
	from: {
		email: "sender@example.com",
		name: "Sender",
	},
	html: "<p>Test</p>",
	priority: "normal",
	data: {},
	template: "test",
} as const;

describe("Nodemailer plugin", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	test("verifies the transporter once per runtime lifecycle", async () => {
		const transporter = createTransporter();
		const adapter = createAdapter(transporter);

		await Promise.all([
			adapter.lifecycle?.init?.(runtimeContext as never),
			adapter.lifecycle?.init?.(runtimeContext as never),
		]);

		expect(transporter.verify).toHaveBeenCalledTimes(1);
	});

	test("does not verify the transporter for queue consumers", async () => {
		const transporter = createTransporter();
		const adapter = createAdapter(transporter);

		await adapter.lifecycle?.init?.({
			...runtimeContext,
			purpose: "queue-consumer",
		} as never);

		expect(transporter.verify).not.toHaveBeenCalled();
	});

	test("does not verify the transporter when email simulation is enabled", async () => {
		const transporter = createTransporter();
		const adapter = createAdapter(transporter, true);

		await adapter.lifecycle?.init?.(runtimeContext as never);

		expect(transporter.verify).not.toHaveBeenCalled();
	});

	test("logs one warning when runtime verification fails", async () => {
		const transporter = createTransporter();
		vi.mocked(transporter.verify).mockRejectedValue(
			new Error("connect ECONNREFUSED 127.0.0.1:1025"),
		);
		const adapter = createAdapter(transporter);

		await adapter.lifecycle?.init?.(runtimeContext as never);
		await adapter.lifecycle?.init?.(runtimeContext as never);

		expect(transporter.verify).toHaveBeenCalledTimes(1);
		expect(mocks.warn).toHaveBeenCalledTimes(1);
	});

	test("sends without running a second transporter verification", async () => {
		const transporter = createTransporter();
		const adapter = createAdapter(transporter);

		const result = await adapter.send({} as never, email as never);

		expect(transporter.verify).not.toHaveBeenCalled();
		expect(transporter.sendMail).toHaveBeenCalledTimes(1);
		expect(result.success).toBe(true);
	});
});

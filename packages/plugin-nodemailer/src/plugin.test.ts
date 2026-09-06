import type { Transporter } from "nodemailer";
import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	warn: vi.fn(),
}));

vi.mock("@lucidcms/core", async (importOriginal) => ({
	...(await importOriginal()),
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

const createAdapter = (transporter: Transporter) => {
	const definition = plugin({ transporter });
	const defaults = definition.defaults;
	if (typeof defaults !== "function") {
		throw new Error("Nodemailer plugin did not provide adapter defaults.");
	}
	const adapter = defaults({ email: { simulate: false } } as never).email
		?.adapter;
	if (!adapter || adapter instanceof Promise || typeof adapter === "function") {
		throw new Error("Nodemailer plugin did not register an email adapter.");
	}
	return adapter;
};

const runtimeContext = {
	config: { email: { simulate: false } },
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

	test("honours the final simulation setting for verification and sending", async () => {
		const transporter = createTransporter();
		const adapter = createAdapter(transporter);

		const context = { config: { email: { simulate: true } } };
		await adapter.lifecycle?.init?.(context as never);
		const result = await adapter.send(context as never, email);

		expect(result.success).toBe(true);
		expect(transporter.sendMail).not.toHaveBeenCalled();
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

		const result = await adapter.send(runtimeContext as never, email);

		expect(transporter.verify).not.toHaveBeenCalled();
		expect(transporter.sendMail).toHaveBeenCalledTimes(1);
		expect(result.success).toBe(true);
	});
});

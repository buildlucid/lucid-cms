import { Hono } from "hono";
import { describe, expect, test, vi } from "vitest";
import constants from "../../../constants/constants.js";
import type { LucidHonoGeneric } from "../../../types/hono.js";
import { LucidAPIError } from "../../../utils/errors/index.js";
import type { CaptchaConfig } from "../../captcha/types.js";
import verifyCaptcha from "./verify-captcha.js";

vi.mock("../utils/create-service-context.js", () => ({
	default: (c: { get: (key: string) => unknown }) => ({
		captcha: c.get("captcha"),
		config: c.get("config"),
	}),
}));

const createApp = (props: {
	forms?: CaptchaConfig["forms"];
	signedIn?: boolean;
}) => {
	const adapter = {
		type: "captcha-adapter" as const,
		key: "test",
		verify: vi.fn(async () => ({ success: true as const })),
	};
	const app = new Hono<LucidHonoGeneric>()
		.use(async (c, next) => {
			c.set("config", { captcha: { adapter, forms: props.forms } } as never);
			c.set("captcha", adapter);
			if (props.signedIn) c.set("auth", { id: 1 } as never);
			await next();
		})
		.post("/", verifyCaptcha("login"), (c) => c.body(null, 204))
		.onError((error, c) =>
			c.json(error instanceof LucidAPIError ? error.error : {}),
		);

	return { adapter, app };
};

describe("verifyCaptcha", () => {
	test("checks the header token against the form's action", async () => {
		const { adapter, app } = createApp({});

		const missing = await app.request("/", { method: "POST" });
		expect(await missing.json()).toMatchObject({ code: "captcha_required" });
		expect(adapter.verify).not.toHaveBeenCalled();

		const sent = await app.request("/", {
			method: "POST",
			headers: { [constants.headers.captcha]: "token" },
		});
		expect(sent.status).toBe(204);
		expect(adapter.verify).toHaveBeenCalledWith(expect.anything(), {
			token: "token",
			action: "lucid_login",
		});
	});

	test("skips forms that aren't protected and signed-in requests", async () => {
		const unprotected = createApp({ forms: { login: false } });
		const signedIn = createApp({ signedIn: true });

		expect(
			(await unprotected.app.request("/", { method: "POST" })).status,
		).toBe(204);
		expect((await signedIn.app.request("/", { method: "POST" })).status).toBe(
			204,
		);
		expect(unprotected.adapter.verify).not.toHaveBeenCalled();
		expect(signedIn.adapter.verify).not.toHaveBeenCalled();
	});
});

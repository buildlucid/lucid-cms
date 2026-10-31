import type z from "zod";
import type { inputSchema } from "./schema.js";

export type ToolkitCaptchaVerifyInput = z.input<typeof inputSchema>;

export type ToolkitCaptchaVerifyResult = {
	/** From 0, likely a bot, to 1, likely a person, for providers that score requests. */
	score?: number;
};

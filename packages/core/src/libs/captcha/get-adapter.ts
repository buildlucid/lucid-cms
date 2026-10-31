import type { ResolvedLucidConfig } from "../../types/config.js";
import { LucidError } from "../../utils/errors/index.js";
import type { CaptchaAdapterInstance } from "./types.js";

/** Resolves the configured captcha adapter, returning null when omitted. */
const getCaptchaAdapter = async (
	config: Pick<ResolvedLucidConfig, "captcha">,
): Promise<CaptchaAdapterInstance | null> => {
	if (!config.captcha?.adapter) return null;

	try {
		return await (typeof config.captcha.adapter === "function"
			? config.captcha.adapter()
			: config.captcha.adapter);
	} catch (error) {
		if (error instanceof LucidError) throw error;
		throw new LucidError({
			message: "The configured captcha adapter could not be initialized.",
			data: {
				errorMessage: error instanceof Error ? error.message : String(error),
			},
		});
	}
};

export default getCaptchaAdapter;

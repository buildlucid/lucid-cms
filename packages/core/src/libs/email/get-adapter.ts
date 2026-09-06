import type { ResolvedLucidConfig } from "../../types/config.js";
import { LucidError } from "../../utils/errors/index.js";
import passthroughEmailAdapter from "./adapters/passthrough.js";
import type { EmailAdapterInstance } from "./types.js";

/** Resolves the configured email adapter, using simulation when omitted. */
const getEmailAdapter = async (config: {
	email: Pick<ResolvedLucidConfig["email"], "adapter">;
}): Promise<EmailAdapterInstance> => {
	if (!config.email.adapter) return passthroughEmailAdapter();

	try {
		return await (typeof config.email.adapter === "function"
			? config.email.adapter()
			: config.email.adapter);
	} catch (error) {
		if (error instanceof LucidError) throw error;
		throw new LucidError({
			message: "The configured email adapter could not be initialized.",
			data: {
				errorMessage: error instanceof Error ? error.message : String(error),
			},
		});
	}
};

export default getEmailAdapter;

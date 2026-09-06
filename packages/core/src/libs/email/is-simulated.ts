import type { ResolvedLucidConfig } from "../../types/config.js";
import type { EmailAdapterInstance } from "./types.js";

/** Resolve whether Lucid should skip sending through the configured email adapter. */
const isEmailSimulated = (context: {
	config: ResolvedLucidConfig;
	email: EmailAdapterInstance;
}) => context.config.email.simulate || context.email.key === "passthrough";

export default isEmailSimulated;

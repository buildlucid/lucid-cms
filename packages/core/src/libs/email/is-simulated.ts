import type { Config } from "../../types/config.js";
import type { EmailAdapterInstance } from "./types.js";

/** Resolve whether Lucid should skip sending through the configured email adapter. */
const isEmailSimulated = (context: {
	config: Config;
	email: EmailAdapterInstance;
}) => context.config.email.simulate || context.email.key === "passthrough";

export default isEmailSimulated;

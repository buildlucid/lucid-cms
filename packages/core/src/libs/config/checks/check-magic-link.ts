import type { ResolvedLucidConfig } from "../../../types/config.js";
import logger from "../../logger/index.js";

/** Rejects magic link login without an email adapter, and warns when its emails are only simulated. */
const checkMagicLink = (config: ResolvedLucidConfig) => {
	if (!config.auth.magicLink.enabled) return;

	if (!config.email.adapter) {
		throw new Error(
			"Magic link login is enabled, but no email adapter is configured. Add an email plugin or set auth.magicLink.enabled to false.",
		);
	}

	if (config.email.simulate) {
		logger.warn({
			dedupeKey: "magic-link-simulated-email",
			scope: "config",
			message:
				"Magic link login is enabled while email.simulate is on, so login emails are recorded but never sent.",
		});
	}
};

export default checkMagicLink;

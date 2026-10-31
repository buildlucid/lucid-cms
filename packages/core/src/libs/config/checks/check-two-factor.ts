import type { ResolvedLucidConfig } from "../../../types/config.js";

const checkTwoFactor = (config: ResolvedLucidConfig) => {
	if (
		config.auth.twoFactor.required !== false &&
		!config.auth.twoFactor.enabled
	) {
		throw new Error(
			"auth.twoFactor.required is on, but auth.twoFactor.enabled is false. Enable two-factor authentication or stop requiring it.",
		);
	}
};

export default checkTwoFactor;

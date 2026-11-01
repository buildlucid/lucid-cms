import type { ResolvedLucidConfig } from "../../../../types/config.js";

/** Checks whether an enabled provider bypasses Lucid's two-factor step. */
const bypassesTwoFactor = (config: ResolvedLucidConfig, providerKey: string) =>
	config.auth.providers.some(
		(provider) =>
			provider.key === providerKey &&
			provider.enabled &&
			provider.bypassTwoFactor === true,
	);

export default bypassesTwoFactor;

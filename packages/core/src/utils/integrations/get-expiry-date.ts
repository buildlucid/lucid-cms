import type { IntegrationExpiry } from "../../schemas/integrations.js";

/**
 * Resolves an integration expiry option to its persisted timestamp.
 */
const getExpiryDate = (
	expiry: IntegrationExpiry,
	now = new Date(),
): string | null => {
	switch (expiry) {
		case "30-days":
			return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
		case "90-days":
			return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();
		case "1-year": {
			const expiresAt = new Date(now);
			expiresAt.setUTCFullYear(expiresAt.getUTCFullYear() + 1);
			return expiresAt.toISOString();
		}
		case "never":
			return null;
	}
};

export default getExpiryDate;

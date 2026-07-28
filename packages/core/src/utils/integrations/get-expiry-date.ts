import { addDays, addYears } from "date-fns";
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
			return addDays(now, 30).toISOString();
		case "90-days":
			return addDays(now, 90).toISOString();
		case "1-year":
			return addYears(now, 1).toISOString();
		case "never":
			return null;
	}
};

export default getExpiryDate;

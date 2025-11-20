import T from "../../translations/index.js";
import { LucidError } from "../../utils/errors/index.js";
import type { BooleanInt } from "../db-adapter/types.js";
// formatters
export { default as usersFormatter } from "./users.js";
export { default as rolesFormatter } from "./roles.js";
export { default as permissionsFormatter } from "./permissions.js";
export { default as optionsFormatter } from "./options.js";
export { default as mediaFormatter } from "./media.js";
export { default as mediaFoldersFormatter } from "./media-folders.js";
export { default as mediaShareLinksFormatter } from "./media-share-links.js";
export { default as localesFormatter } from "./locales.js";
export { default as emailsFormatter } from "./emails.js";
export { default as jobsFormatter } from "./jobs.js";
export { default as collectionsFormatter } from "./collections.js";
export { default as clientIntegrationsFormatter } from "./client-integrations.js";
export { default as documentBricksFormatter } from "./document-bricks.js";
export { default as documentFieldsFormatter } from "./document-fields.js";
export { default as documentVersionsFormatter } from "./document-versions.js";
export { default as documentsFormatter } from "./documents.js";
export { default as licenseFormatter } from "./license.js";
export { default as userPermissionsFormatter } from "./user-permissions.js";
export { default as userLoginsFormatter } from "./user-logins.js";
export { default as settingsFormatter } from "./settings.js";

const formatDate = (date: Date | string | null | undefined): string | null => {
	if (typeof date === "string") {
		return date;
	}
	return date ? date.toISOString() : null;
};

const parseJSON = <T>(json: string | null | undefined): T | null => {
	if (typeof json === "object") return json;
	if (!json) return null;
	try {
		return JSON.parse(json);
	} catch (error) {
		return null;
	}
};

const stringifyJSON = (json: Record<string, unknown> | null): string | null => {
	try {
		if (!json) return null;
		return JSON.stringify(json);
	} catch (error) {
		return null;
	}
};

const parseCount = (count: string | number | undefined) => {
	if (typeof count === "number") return count;
	return Number.parseInt(count || "0") || 0;
};

/** Used to normalize user input date to a ISO string */
const normalizeDate = (date: Date | string | null | undefined) => {
	if (date === null) return null;
	if (date === undefined) return undefined;

	const dateObject = typeof date === "string" ? new Date(date) : date;

	if (Number.isNaN(dateObject.getTime())) {
		return null;
	}

	return dateObject.toISOString();
};

/**
 * Handles formatting a BooleanInt response from the DB to a boolean
 */
function formatBoolean(bool: BooleanInt): boolean;
function formatBoolean(bool: BooleanInt | null | undefined): boolean | null;
function formatBoolean(bool: BooleanInt | null | undefined): boolean | null {
	if (bool === null || bool === undefined) return null;
	if (typeof bool === "boolean") return bool;
	return bool === 1;
}

export default {
	formatDate,
	parseJSON,
	stringifyJSON,
	parseCount,
	normalizeDate,
	formatBoolean,
};

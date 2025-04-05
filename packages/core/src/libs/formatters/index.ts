import T from "../../translations/index.js";
import { LucidError } from "../../utils/errors/index.js";
import type { BooleanInt } from "../db/types.js";
// Formatters
import UsersFormatter from "./users.js";
import UserPermissionsFormatter from "./user-permissions.js";
import RolesFormatter from "./roles.js";
import SettingsFormatter from "./settings.js";
import PermissionsFormatter from "./permissions.js";
import OptionsFormatter from "./options.js";
import MediaFormatter from "./media.js";
import LocalesFormatter from "./locales.js";
import EmailsFormatter from "./emails.js";
import CollectionsFormatter from "./collections.js";
import ClientIntegrationsFormatter from "./client-integrations.js";
import DocumentBricksFormatter from "./document-bricks.js";
import DocumentFieldsFormatter from "./document-fields.js";
// TODO: remove bellow
import CollectionDocumentFieldsFormatter from "./collection-document-fields.js";
import CollectionDocumentsFormatter from "./collection-documents.js";
import CollectionDocumentBricksFormatter from "./collection-document-bricks.js";
import CollectionDocumentVersions from "./collection-document-versions.js";

// biome-ignore lint/complexity/noStaticOnlyClass: <explanation>
class Formatter {
	static get<T extends keyof FormatterClassMap>(
		format: T,
	): FormatterReturnType<T> {
		switch (format) {
			case "users":
				return new UsersFormatter() as FormatterReturnType<T>;
			case "user-permissions":
				return new UserPermissionsFormatter() as FormatterReturnType<T>;
			case "settings":
				return new SettingsFormatter() as FormatterReturnType<T>;
			case "roles":
				return new RolesFormatter() as FormatterReturnType<T>;
			case "permissions":
				return new PermissionsFormatter() as FormatterReturnType<T>;
			case "options":
				return new OptionsFormatter() as FormatterReturnType<T>;
			case "media":
				return new MediaFormatter() as FormatterReturnType<T>;
			case "locales":
				return new LocalesFormatter() as FormatterReturnType<T>;
			case "emails":
				return new EmailsFormatter() as FormatterReturnType<T>;
			case "collections":
				return new CollectionsFormatter() as FormatterReturnType<T>;
			case "client-integrations":
				return new ClientIntegrationsFormatter() as FormatterReturnType<T>;
			case "document-bricks":
				return new DocumentBricksFormatter() as FormatterReturnType<T>;
			case "document-fields":
				return new DocumentFieldsFormatter() as FormatterReturnType<T>;
			case "collection-documents":
				return new CollectionDocumentsFormatter() as FormatterReturnType<T>;
			case "collection-document-bricks":
				return new CollectionDocumentBricksFormatter() as FormatterReturnType<T>;
			case "collection-document-fields":
				return new CollectionDocumentFieldsFormatter() as FormatterReturnType<T>;
			case "collection-document-versions":
				return new CollectionDocumentVersions() as FormatterReturnType<T>;

			default:
				throw new LucidError({
					message: T("cannot_find_formatter", {
						name: format,
					}),
				});
		}
	}
	// helpers
	static formatDate = (
		date: Date | string | null | undefined,
	): string | null => {
		if (typeof date === "string") {
			return date;
		}
		return date ? date.toISOString() : null;
	};
	static parseJSON = <T>(json: string | null | undefined): T | null => {
		if (typeof json === "object") return json;
		if (!json) return null;
		try {
			return JSON.parse(json);
		} catch (error) {
			return null;
		}
	};
	static stringifyJSON = (
		json: Record<string, unknown> | null,
	): string | null => {
		try {
			if (!json) return null;
			return JSON.stringify(json);
		} catch (error) {
			return null;
		}
	};
	static parseCount = (count: string | undefined) => {
		return Number.parseInt(count || "0") || 0;
	};
	/**
	 * Handles formatting a BooleanInt response from the DB to a boolean
	 */
	static formatBoolean(bool: BooleanInt): boolean;
	static formatBoolean(bool: BooleanInt | null | undefined): boolean | null;
	static formatBoolean(bool: BooleanInt | null | undefined): boolean | null {
		if (bool === null || bool === undefined) return null;
		if (typeof bool === "boolean") return bool;
		return bool === 1;
	}
}

type FormatterClassMap = {
	users: UsersFormatter;
	"user-permissions": UserPermissionsFormatter;
	settings: SettingsFormatter;
	roles: RolesFormatter;
	permissions: PermissionsFormatter;
	options: OptionsFormatter;
	media: MediaFormatter;
	locales: LocalesFormatter;
	emails: EmailsFormatter;
	collections: CollectionsFormatter;
	"client-integrations": ClientIntegrationsFormatter;
	"document-bricks": DocumentBricksFormatter;
	"document-fields": DocumentFieldsFormatter;

	"collection-documents": CollectionDocumentsFormatter;
	"collection-document-bricks": CollectionDocumentBricksFormatter;
	"collection-document-fields": CollectionDocumentFieldsFormatter;
	"collection-document-versions": CollectionDocumentVersions;
};

type FormatterReturnType<T extends keyof FormatterClassMap> =
	FormatterClassMap[T];

export default Formatter;

import z from "zod";
import { translate } from "../../libs/i18n/index.js";

/** Excludes `@` to keep usernames distinct from email login identifiers. */
export const usernameSchema = z
	.string()
	.trim()
	.min(3)
	.regex(/^[^@]*$/, {
		error: translate("server:core.users.username.email"),
	});

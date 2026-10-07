import type { LucidNotificationTypeSettings } from "../db/tables/index.js";
import type { Select } from "../db/types.js";
import formatter from "../formatters/helpers.js";
import type { AnyNotificationDefinition } from "./types.js";

/** A type's effective settings. Rows only exist once an admin changes a type, so the definition's defaults fill the gaps. */
const resolveTypeSettings = (props: {
	definition: AnyNotificationDefinition;
	row:
		| Pick<
				Select<LucidNotificationTypeSettings>,
				"enabled" | "email_enabled" | "role_ids"
		  >
		| undefined;
}) => ({
	enabled:
		props.definition.required ||
		(props.row
			? formatter.formatBoolean(props.row.enabled)
			: props.definition.defaults.enabled),
	email: props.row
		? formatter.formatBoolean(props.row.email_enabled)
		: props.definition.defaults.email,
	roleIds: props.row?.role_ids ?? null,
});

export default resolveTypeSettings;

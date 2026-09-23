import { fieldSlotKeys } from "@lucidcms/admin/slots";
import { defineAdminSlot } from "@lucidcms/core";
import { COMPONENTS_MODULE, fields, PLUGIN_KEY } from "../../../constants.js";

const altGuidanceConfig = (collection: string, brick: string) =>
	[fields.socialImageAlt, fields.xImageAlt].map((field) =>
		defineAdminSlot({
			key: `${PLUGIN_KEY}:${collection}:${brick}:${field}`,
			slot: fieldSlotKeys.after,
			match: { collection, brick, kind: "fixed", field },
			component: { module: COMPONENTS_MODULE, export: "AltGuidance" },
		}),
	);

export default altGuidanceConfig;

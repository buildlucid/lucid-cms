import { defineAdminSlot } from "@lucidcms/core";
import { COMPONENTS_MODULE, PLUGIN_KEY } from "../../../constants.js";

export type SeoPreviewOptions = {
	/** Supplies the preview domain when a document has no canonical URL. */
	siteUrl?: string;
};

const seoPreviewConfig = (
	collection: string,
	brick: string,
	options: SeoPreviewOptions,
) =>
	defineAdminSlot({
		key: `${PLUGIN_KEY}:${collection}:${brick}:preview`,
		slot: "brick.end",
		width: 5,
		sticky: true,
		match: { collection, brick, kind: "fixed" },
		component: { module: COMPONENTS_MODULE, export: "SeoPreview" },
		options: options,
	});

export default seoPreviewConfig;

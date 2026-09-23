import type { AdminSlot } from "@lucidcms/admin/types";
import altGuidanceConfig from "../admin/components/AltGuidance/config.js";
import indexingGuidanceConfig from "../admin/components/IndexingGuidance/config.js";
import seoPreviewConfig, {
	type SeoPreviewOptions,
} from "../admin/components/SeoPreview/config.js";
import seoSummaryConfig from "../admin/components/SeoSummary/config.js";
import textGuidanceConfig from "../admin/components/TextGuidance/config.js";

/** Package exports are resolved by the admin compiler without loading Solid on the server. */
const registerAdminSlots = (
	collection: string,
	brick: string,
	previewOptions: SeoPreviewOptions,
): AdminSlot[] => [
	seoSummaryConfig(collection, brick),
	seoPreviewConfig(collection, brick, previewOptions),
	...textGuidanceConfig(collection, brick),
	...altGuidanceConfig(collection, brick),
	indexingGuidanceConfig(collection, brick),
];
export default registerAdminSlots;

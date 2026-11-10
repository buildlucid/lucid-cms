import { useTranslation } from "@lucidcms/admin/hooks";
import type { SlotComponent } from "@lucidcms/admin/types";
import type indexingGuidanceConfig from "./config.js";

const IndexingGuidance: SlotComponent<
	ReturnType<typeof indexingGuidanceConfig>
> = (props) => {
	// ----------------------------------
	// State & Hooks
	const { t } = useTranslation();

	// ----------------------------------
	// Render
	return (
		<p
			class="text-sm text-muted"
			classList={{ "text-warning": props.field.value === "noindex" }}
		>
			{t(
				props.field.value === "noindex"
					? "plugin.seo.indexing.noindex"
					: "plugin.seo.indexing.index",
			)}
		</p>
	);
};
export default IndexingGuidance;

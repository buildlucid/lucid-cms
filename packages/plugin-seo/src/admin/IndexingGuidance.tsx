import { useTranslation } from "@lucidcms/admin/hooks";
import type { FieldSlotComponent } from "@lucidcms/admin/types";
import type {} from "../shared/translations.js";

const IndexingGuidance: FieldSlotComponent = (props) => {
	// ----------------------------------
	// State & Hooks
	const { t } = useTranslation();

	// ----------------------------------
	// Render
	return (
		<p
			class="text-sm text-unfocused"
			classList={{ "text-warning-base": props.field.value === "noindex" }}
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

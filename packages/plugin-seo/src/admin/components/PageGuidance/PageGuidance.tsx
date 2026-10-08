import { useTranslation } from "@lucidcms/admin/hooks";
import { TbOutlineEyeOff } from "solid-icons/tb";
import { type Component, Show } from "solid-js";
import type {} from "../../../shared/translations.js";

const PageGuidance: Component<{ noindex: boolean }> = (props) => {
	// ----------------------------------
	// State & Hooks
	const { t } = useTranslation();

	// ----------------------------------
	// Render
	return (
		<Show when={props.noindex}>
			<section
				class="mt-4 border-t border-border pt-3 text-sm"
				aria-label={t("plugin.seo.pageGuidance.label")}
			>
				<p class="mb-2 text-sm font-medium text-subtitle">
					{t("plugin.seo.pageGuidance.label")}
				</p>
				<ul>
					<li class="flex items-start gap-2 text-sm text-muted">
						<TbOutlineEyeOff
							aria-hidden="true"
							size={14}
							class="mt-1 shrink-0"
						/>
						<span>{t("plugin.seo.pageGuidance.noindex")}</span>
					</li>
				</ul>
			</section>
		</Show>
	);
};
export default PageGuidance;

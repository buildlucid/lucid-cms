import { type TranslationKey, useTranslation } from "@lucidcms/admin/hooks";
import type { FieldSlotComponent } from "@lucidcms/admin/types";
import { Show } from "solid-js";
import { fields } from "../constants.js";
import { assessText } from "../shared/assessments.js";
import type {} from "../shared/translations.js";

const descriptions: Partial<Record<string, TranslationKey>> = {
	[fields.title]: "plugin.seo.help.title",
	[fields.description]: "plugin.seo.help.description",
	[fields.socialTitle]: "plugin.seo.help.socialTitle",
	[fields.socialDescription]: "plugin.seo.help.socialDescription",
	[fields.xTitle]: "plugin.seo.help.xTitle",
	[fields.xDescription]: "plugin.seo.help.xDescription",
};

const TextGuidance: FieldSlotComponent = (props) => {
	// ----------------------------------
	// State & Hooks
	const { t } = useTranslation();

	// ----------------------------------
	// Memos
	const assessment = () =>
		assessText(
			typeof props.field.value === "string" ? props.field.value : "",
			props.field.type === "textarea" ? "description" : "title",
		);

	// ----------------------------------
	// Render
	return (
		<div
			class="space-y-1.5 text-sm text-unfocused"
			title={t("plugin.seo.guidance.note")}
			data-testid="seo-text-guidance"
		>
			<div class="flex flex-wrap justify-between gap-2">
				<span>
					{t("plugin.seo.guidance.count", { count: assessment().count })}
				</span>
				<span
					classList={{ "text-warning-base": assessment().status === "long" }}
				>
					{t(`plugin.seo.guidance.${assessment().status}`)}
				</span>
			</div>
			<div
				class="h-2 overflow-hidden rounded-full bg-unfocused/30"
				aria-hidden="true"
			>
				<div
					class="h-full rounded-full transition-all"
					classList={{
						"bg-primary-base": assessment().status !== "long",
						"bg-warning-base": assessment().status === "long",
					}}
					style={{
						width: `${Math.min(100, (assessment().count / assessment().guide) * 100)}%`,
					}}
				/>
			</div>
			<Show when={descriptions[props.field.key]}>
				{(key) => <p class="text-sm text-unfocused">{t(key())}</p>}
			</Show>
		</div>
	);
};
export default TextGuidance;

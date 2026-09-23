import { ProgressBar } from "@lucidcms/admin/components";
import { type TranslationKey, useTranslation } from "@lucidcms/admin/hooks";
import type { FieldSlotComponent } from "@lucidcms/admin/types";
import { createMemo, Show } from "solid-js";
import { fields } from "../../../constants.js";
import { assessText } from "../../../shared/assessments.js";
import type {} from "../../../shared/translations.js";

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
	const assessment = createMemo(() =>
		assessText(
			typeof props.field.value === "string" ? props.field.value : "",
			props.field.type === "textarea" ? "description" : "title",
		),
	);

	// ----------------------------------
	// Render
	return (
		<div
			class="space-y-1.5 text-sm text-muted"
			title={t("plugin.seo.guidance.note")}
			data-testid="seo-text-guidance"
		>
			<div class="flex flex-wrap justify-between gap-2">
				<span>
					{t("plugin.seo.guidance.count", { count: assessment().count })}
				</span>
				<span classList={{ "text-warning": assessment().status === "long" }}>
					{t(`plugin.seo.guidance.${assessment().status}`)}
				</span>
			</div>
			<ProgressBar
				size="md"
				variant={assessment().status === "long" ? "warning" : "success"}
				value={(assessment().count / assessment().guide) * 100}
			/>
			<Show when={descriptions[props.field.key]}>
				{(key) => <p class="text-sm text-muted">{t(key())}</p>}
			</Show>
		</div>
	);
};
export default TextGuidance;

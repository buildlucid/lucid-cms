import { ProgressBar } from "@lucidcms/admin/components";
import { useTranslation } from "@lucidcms/admin/hooks";
import type { BrickSlotComponent } from "@lucidcms/admin/types";
import { createMemo, Show } from "solid-js";
import { fields } from "../constants.js";
import { assessBasics } from "../shared/assessments.js";
import type {} from "../shared/translations.js";
import { readImageField, readText } from "./field-values.js";

const SeoSummary: BrickSlotComponent = (props) => {
	// ----------------------------------
	// State & Hooks
	const { t } = useTranslation();

	// ----------------------------------
	// Memos
	const score = createMemo(() =>
		props.open
			? 0
			: assessBasics({
					title: readText(props.brick.fields, fields.title),
					description: readText(props.brick.fields, fields.description),
					image:
						readImageField(props.brick.fields, fields.socialImage) !==
						undefined,
				}),
	);
	const variant = createMemo(() =>
		score() === 100 ? "success" : score() >= 50 ? "warning" : "danger",
	);

	// ----------------------------------
	// Render
	return (
		<Show when={!props.open}>
			<div
				class="flex items-center gap-2 whitespace-nowrap rounded-md border border-border px-2.5 py-1.5 text-xs text-body"
				title={t("plugin.seo.summary.help")}
				data-testid="seo-summary"
			>
				<span>{t("plugin.seo.summary.label")}</span>
				<ProgressBar
					size="sm"
					variant={variant()}
					value={score()}
					class="hidden w-12 sm:block"
				/>
				<span aria-hidden="true" class="tabular-nums text-subtitle">
					{score()}/100
				</span>
			</div>
		</Show>
	);
};
export default SeoSummary;

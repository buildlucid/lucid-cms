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
	const color = createMemo(() =>
		score() === 100
			? "bg-primary-base"
			: score() >= 50
				? "bg-warning-base"
				: "bg-error-base",
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
				<span
					class="hidden h-1.5 w-12 overflow-hidden rounded-full bg-border sm:block"
					aria-hidden="true"
				>
					<span
						class={`block h-full rounded-full ${color()}`}
						style={{ width: `${score()}%` }}
					/>
				</span>
				<meter
					class="sr-only"
					min={0}
					max={100}
					value={score()}
					aria-label={t("plugin.seo.summary.label")}
				/>
				<span aria-hidden="true" class="tabular-nums text-subtitle">
					{score()}/100
				</span>
			</div>
		</Show>
	);
};
export default SeoSummary;

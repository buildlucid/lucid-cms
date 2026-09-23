import { Select } from "@lucidcms/admin/components";
import { useAdminConfig, useTranslation } from "@lucidcms/admin/hooks";
import type { BrickSlotComponent } from "@lucidcms/admin/types";
import { createMemo, createSignal, Match, Switch } from "solid-js";
import { fields } from "../../../constants.js";
import { resolveSocialText } from "../../../shared/assessments.js";
import type {} from "../../../shared/translations.js";
import { readImageField, readText } from "../../utils/field-values.js";
import PageGuidance from "../PageGuidance/PageGuidance.js";
import SearchPreview from "../SearchPreview/SearchPreview.js";
import SocialPreview from "../SocialPreview/SocialPreview.js";
import type { SeoPreviewOptions } from "./config.js";

type PreviewView = "search" | "social" | "x";
type PreviewOption = { value: PreviewView; label: string };

const SeoPreview: BrickSlotComponent<SeoPreviewOptions> = (props) => {
	// ----------------------------------
	// State & Hooks
	const { t } = useTranslation();
	const config = useAdminConfig();
	const [view, setView] = createSignal<PreviewView>("search");

	// ----------------------------------
	// Memos
	const text = (key: string) => readText(props.brick.fields, key);
	const resolved = createMemo(() =>
		resolveSocialText({
			title: text(fields.title),
			description: text(fields.description),
			socialTitle: text(fields.socialTitle),
			socialDescription: text(fields.socialDescription),
			xTitle: text(fields.xTitle),
			xDescription: text(fields.xDescription),
		}),
	);
	const url = createMemo(() => {
		try {
			return new URL(
				text(fields.canonicalUrl) || props.context.route?.path || "",
				props.options.siteUrl,
			);
		} catch {
			return undefined;
		}
	});
	const host = () => url()?.hostname || "";
	const siteName = () => config.brand.name || t("plugin.seo.preview.url");
	const path = createMemo(() =>
		(url()?.pathname || props.context.route?.path || "")
			.split(/[?#]/)[0]
			?.split("/")
			.filter(Boolean)
			.join(" › "),
	);
	const socialImage = createMemo(() =>
		readImageField(props.brick.fields, fields.socialImage),
	);
	const xImage = createMemo(() =>
		readImageField(props.brick.fields, fields.xImage),
	);

	// ----------------------------------
	// Render
	return (
		<aside
			class="w-full @min-[48rem]/brick:-mt-4"
			aria-label={t("plugin.seo.preview.label")}
			data-testid="seo-preview"
		>
			<div class="mb-3 flex items-center justify-between gap-3">
				<p class="text-sm font-medium text-subtitle">
					{t("plugin.seo.preview.label")}
				</p>
				<Select<PreviewOption>
					id={`${props.brick.ref}-seo-preview`}
					name="seo-preview"
					aria-label={t("plugin.seo.preview.select")}
					size="sm"
					placeholder={false}
					class="w-36"
					value={view()}
					onChange={(value) => {
						if (value) setView(value);
					}}
					options={[
						{ value: "search", label: t("plugin.seo.preview.search") },
						{ value: "social", label: t("plugin.seo.preview.social") },
						{ value: "x", label: t("plugin.seo.preview.x") },
					]}
				/>
			</div>

			<Switch>
				<Match when={view() === "search"}>
					<SearchPreview
						title={text(fields.title)}
						description={text(fields.description)}
						host={host()}
						siteName={siteName()}
						path={path()}
					/>
				</Match>
				<Match when={view() === "social"}>
					<SocialPreview
						title={resolved().social.title}
						description={resolved().social.description}
						host={host()}
						siteName={siteName()}
						imageId={socialImage()}
						alt={text(fields.socialImageAlt)}
						locale={props.context.contentLocale}
					/>
				</Match>
				<Match when={view() === "x"}>
					<SocialPreview
						title={resolved().x.title}
						description={resolved().x.description}
						host={host()}
						siteName={siteName()}
						imageId={xImage() ?? socialImage()}
						alt={
							text(fields.xImageAlt).trim() ||
							(xImage() === undefined ? text(fields.socialImageAlt) : "")
						}
						locale={props.context.contentLocale}
						compact={text(fields.xCard) === "summary"}
					/>
				</Match>
			</Switch>
			<PageGuidance noindex={text(fields.indexing) === "noindex"} />
		</aside>
	);
};

export default SeoPreview;

import { useAdminConfig, useTranslation } from "@lucidcms/admin/hooks";
import type { BrickSlotComponent } from "@lucidcms/admin/types";
import { FaSolidChevronDown } from "solid-icons/fa";
import { createMemo, createSignal, Match, Switch } from "solid-js";
import { fields } from "../constants.js";
import { resolveSocialText } from "../shared/assessments.js";
import type {} from "../shared/translations.js";
import { readImageField, readText } from "./field-values.js";
import PageGuidance from "./PageGuidance.js";
import SearchPreview from "./SearchPreview.js";
import SocialPreview from "./SocialPreview.js";

const SeoPreview: BrickSlotComponent = (props) => {
	// ----------------------------------
	// State & Hooks
	const { t } = useTranslation();
	const config = useAdminConfig();
	const [view, setView] = createSignal<"search" | "social" | "x">("search");

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
				<div class="relative">
					<select
						aria-label={t("plugin.seo.preview.select")}
						class="cursor-pointer appearance-none rounded-md border border-border bg-input-base py-2 pl-3 pr-8 text-sm text-subtitle outline-primary-base focus-visible:outline-2"
						value={view()}
						onChange={(event) => {
							const value = event.currentTarget.value;
							if (value === "search" || value === "social" || value === "x")
								setView(value);
						}}
					>
						<option value="search">{t("plugin.seo.preview.search")}</option>
						<option value="social">{t("plugin.seo.preview.social")}</option>
						<option value="x">{t("plugin.seo.preview.x")}</option>
					</select>
					<FaSolidChevronDown
						aria-hidden="true"
						size={12}
						class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-subtitle"
					/>
				</div>
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

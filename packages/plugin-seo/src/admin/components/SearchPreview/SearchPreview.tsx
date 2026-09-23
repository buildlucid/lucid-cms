import { useTranslation } from "@lucidcms/admin/hooks";
import { FaSolidGlobe } from "solid-icons/fa";
import type { Component } from "solid-js";
import type {} from "../../../shared/translations.js";

type SearchPreviewProps = {
	title: string;
	description: string;
	host: string;
	siteName: string;
	path?: string;
};

const SearchPreview: Component<SearchPreviewProps> = (props) => {
	// ----------------------------------
	// State & Hooks
	const { t } = useTranslation();

	// ----------------------------------
	// Render
	return (
		<section aria-label={t("plugin.seo.preview.search")}>
			<div
				class="rounded-md border border-[#dadce0] bg-white p-4 shadow-sm"
				style={{ "font-family": "Arial, sans-serif" }}
			>
				<div class="mb-3 flex items-center gap-3">
					<div
						class="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#f1f3f4] text-[#5f6368]"
						aria-hidden="true"
					>
						<FaSolidGlobe aria-hidden="true" size={18} />
					</div>
					<div class="min-w-0">
						<p class="truncate text-xs leading-5 text-[#202124]">
							{props.siteName}
						</p>
						<p class="truncate text-xs leading-5 text-[#4d5156]">
							{[props.host, props.path].filter(Boolean).join(" › ")}
						</p>
					</div>
				</div>
				<p
					class="line-clamp-2 break-words text-sm leading-[1.3] text-[#1a0dab]"
					dir="auto"
				>
					{props.title || t("plugin.seo.preview.title")}
				</p>
				<p
					class="mt-1.5 line-clamp-3 break-words text-xs leading-[1.6] text-[#4d5156]"
					dir="auto"
				>
					{props.description || t("plugin.seo.preview.description")}
				</p>
			</div>
		</section>
	);
};

export default SearchPreview;

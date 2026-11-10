import { Image } from "@lucidcms/admin/components";
import { useTranslation } from "@lucidcms/admin/hooks";
import { mediaUrl } from "@lucidcms/admin/utils";
import { TbOutlinePhoto } from "solid-icons/tb";
import { type Component, Show } from "solid-js";
import type { SeoImage } from "../../utils/field-values.js";

type SocialPreviewProps = {
	title: string;
	description: string;
	host: string;
	siteName: string;
	image: SeoImage | undefined;
	/** The field links to media, which may not be an image or may still be loading. */
	linked: boolean;
	alt: string;
	compact?: boolean;
};

const SocialPreview: Component<SocialPreviewProps> = (props) => {
	// ----------------------------------
	// State & Hooks
	const { t } = useTranslation();

	// ----------------------------------
	// Render
	return (
		<div
			class="overflow-hidden rounded-md border border-border bg-background"
			classList={{ flex: props.compact }}
		>
			<div
				class="relative flex items-center justify-center overflow-hidden bg-card-hover"
				classList={{
					"aspect-[1.91/1] w-full": !props.compact,
					"w-24 min-h-24 shrink-0 self-stretch": props.compact,
				}}
			>
				<Show
					when={props.image}
					fallback={
						<div class="flex flex-col items-center gap-2 p-4 text-subtitle">
							<TbOutlinePhoto aria-hidden="true" size={24} class="opacity-50" />
							<p class="text-center text-sm">
								{t(
									props.linked
										? "plugin.seo.image.unavailable"
										: "plugin.seo.preview.image",
								)}
							</p>
						</div>
					}
				>
					{(image) => (
						<div class="absolute inset-0">
							<Image
								src={mediaUrl(
									image(),
									props.compact ? "thumbnail-small" : "thumbnail-medium",
								)}
								alt={props.alt.trim()}
							/>
						</div>
					)}
				</Show>
			</div>
			<div class="min-w-0 space-y-1 p-4">
				<p class="truncate text-sm uppercase tracking-wide text-subtitle">
					{props.host || props.siteName}
				</p>
				<p
					class="line-clamp-2 break-words text-sm font-semibold leading-snug text-title"
					dir="auto"
				>
					{props.title || t("plugin.seo.preview.title")}
				</p>
				<p
					class="line-clamp-2 break-words text-sm leading-relaxed text-subtitle"
					dir="auto"
				>
					{props.description || t("plugin.seo.preview.description")}
				</p>
			</div>
		</div>
	);
};

export default SocialPreview;

import { useTranslation } from "@lucidcms/admin/hooks";
import { FaSolidImage } from "solid-icons/fa";
import { type Component, Show } from "solid-js";
import type {} from "../shared/translations.js";
import { useImage } from "./use-image.js";

type SocialPreviewProps = {
	title: string;
	description: string;
	host: string;
	siteName: string;
	imageId?: number;
	alt: string;
	locale: string;
	compact?: boolean;
};

const SocialPreview: Component<SocialPreviewProps> = (props) => {
	// ----------------------------------
	// State & Hooks
	const { t } = useTranslation();
	const media = useImage(
		() => props.imageId,
		() => props.locale,
	);

	// ----------------------------------
	// Render
	return (
		<div
			class="overflow-hidden rounded-md border border-border bg-background-base"
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
					when={media.image()}
					fallback={
						<div class="flex flex-col items-center gap-2 p-4 text-subtitle">
							<FaSolidImage aria-hidden="true" size={24} class="opacity-50" />
							<p class="text-center text-sm">
								{t(
									props.imageId === undefined
										? "plugin.seo.preview.image"
										: media.query.isFetching
											? "plugin.seo.image.loading"
											: "plugin.seo.image.unavailable",
								)}
							</p>
						</div>
					}
				>
					{(image) => (
						<img
							src={image().url}
							alt={props.alt.trim() || media.alt()}
							class="absolute inset-0 h-full w-full object-cover"
						/>
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

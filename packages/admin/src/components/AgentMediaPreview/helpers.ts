import type { Media } from "@types";
import contentLocaleStore from "@/store/contentLocaleStore/contentLocaleStore";
import T from "@/translations";
import helpers from "@/utils/helpers";

export const previewButtonClass =
	"flex size-6 items-center justify-center rounded-full border shadow-sm transition-opacity focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary";

export const hasVisual = (media: Media) =>
	media.type === "image" || (media.type === "video" && media.poster !== null);

export const mediaLabel = (media: Media) =>
	helpers.getTranslation(media.title, contentLocaleStore.get.contentLocale) ||
	media.fileName ||
	T()("agent.preview.item", { id: media.id });

export const mediaAlt = (media: Media) =>
	(media.type === "image"
		? helpers.getTranslation(media.alt, contentLocaleStore.get.contentLocale)
		: undefined) || mediaLabel(media);

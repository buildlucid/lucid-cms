import type { BooleanInt } from "../../libs/db-adapter/types.js";
import type { UrlStrategy } from "../../types/config.js";
import type { MediaResponse, MediaType } from "../../types/response.js";
import { createMediaUrl } from "../../utils/media/index.js";
import formatter from "./index.js";

export interface MediaPropsT {
	id: number;
	key: string;
	e_tag: string | null;
	type: string;
	mime_type: string;
	file_extension: string;
	file_size: number;
	width: number | null;
	height: number | null;
	created_at: Date | string | null;
	updated_at: Date | string | null;
	blur_hash: string | null;
	average_color: string | null;
	is_dark: BooleanInt | null;
	is_light: BooleanInt | null;
	translations?: Array<{
		title: string | null;
		alt: string | null;
		locale_code: string | null;
	}>;
	folder_id: number | null;
	is_deleted: BooleanInt;
	is_deleted_at: Date | string | null;
	deleted_by: number | null;
	public: BooleanInt;
}

const objectifyTranslations = (
	target: "title" | "alt",
	translations: {
		title: string | null;
		alt: string | null;
		locale_code: string | null;
	}[],
	locales: Array<string>,
): Record<string, string> => {
	return locales.reduce<Record<string, string>>(
		(acc, locale) => ({
			// biome-ignore lint/performance/noAccumulatingSpread: <explanation>
			...acc,
			[locale ?? ""]:
				translations.find((t) => t.locale_code === locale)?.[target] ?? "",
		}),
		{},
	);
};

const formatMultiple = (props: {
	media: MediaPropsT[];
	host: string;
	urlStrategy: UrlStrategy | undefined;
}) => {
	return props.media.map((m) =>
		formatSingle({
			media: m,
			host: props.host,
			urlStrategy: props.urlStrategy,
		}),
	);
};

const formatSingle = (props: {
	media: MediaPropsT;
	host: string;
	urlStrategy: UrlStrategy | undefined;
}): MediaResponse => {
	return {
		id: props.media.id,
		key: props.media.key,
		folderId: props.media.folder_id,
		url: createMediaUrl({
			key: props.media.key,
			host: props.host,
			urlStrategy: props.urlStrategy,
		}),
		title:
			props.media.translations?.map((t) => ({
				value: t.title,
				localeCode: t.locale_code,
			})) ?? [],
		alt:
			props.media.translations?.map((t) => ({
				value: t.alt,
				localeCode: t.locale_code,
			})) ?? [],
		type: props.media.type as MediaType,
		meta: {
			mimeType: props.media.mime_type,
			extension: props.media.file_extension,
			fileSize: props.media.file_size,
			width: props.media.width,
			height: props.media.height,
			blurHash: props.media.blur_hash,
			averageColor: props.media.average_color,
			isDark: formatter.formatBoolean(props.media.is_dark),
			isLight: formatter.formatBoolean(props.media.is_light),
		},
		public: formatter.formatBoolean(props.media.public),
		isDeleted: formatter.formatBoolean(props.media.is_deleted),
		isDeletedAt: formatter.formatDate(props.media.is_deleted_at),
		deletedBy: props.media.deleted_by,
		createdAt: formatter.formatDate(props.media.created_at),
		updatedAt: formatter.formatDate(props.media.updated_at),
	};
};

export default {
	formatMultiple,
	formatSingle,
	objectifyTranslations,
};

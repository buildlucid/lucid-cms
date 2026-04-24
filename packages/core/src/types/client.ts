//* contains only type exports relating to the integration client endpoints

export type {
	CollectionDocument,
	CollectionDocumentBricksByCollection,
	CollectionDocumentFieldsByCollection,
	CollectionDocumentKey,
	CollectionDocumentLocaleCode,
	CollectionDocumentLocaleCodes,
	CollectionDocumentTranslations,
	DocumentBrick,
	DocumentField,
	DocumentFieldGroup,
	DocumentFieldMap,
	DocumentRef,
	DocumentRelationValue,
	DocumentVersion,
	ErrorResponse,
	GroupDocumentField,
	Locale,
	Media,
	MediaEmbed,
	MediaPoster,
	MediaRef,
	MediaType,
	MediaUrl,
	ProfilePicture,
	ResponseBody,
	TranslatedDocumentField,
	UserRef,
	ValueDocumentField,
} from "./public.js";

export type MediaProcessOptions = {
	preset?: string;
	format?: "webp" | "avif" | "jpeg" | "png";
};

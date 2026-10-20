import type {
	DocumentRoute,
	InternalDocumentField,
	LocalizedDocumentRoute,
} from "../../exports/types.js";
import type CollectionBuilder from "../collection/builders/collection-builder/index.js";
import {
	formatDocumentLabelValue,
	getDocumentFallbackLabel,
	getDocumentLabelField,
} from "../collection/helpers/document-label.js";
import formatter, { type ContentReadLocale } from "./helpers.js";

const normalizeValue = (value: unknown): string | null => {
	if (typeof value === "string") {
		const trimmed = value.trim();
		return trimmed.length > 0 ? trimmed : null;
	}

	if (typeof value === "number" && Number.isFinite(value)) {
		return String(value);
	}

	return null;
};

const resolvePathValue = (field: InternalDocumentField, locales: string[]) => {
	if (field.translations) {
		return Object.fromEntries(
			locales.map((locale) => [
				locale,
				normalizeValue(field.translations?.[locale]),
			]),
		);
	}

	return normalizeValue(field.value);
};

/** Resolves a collection's routing field and standard document label. */
const formatDocumentRoute = (props: {
	collection: CollectionBuilder;
	documentId: number;
	fields: InternalDocumentField[] | null | undefined;
	locales: string[];
}): DocumentRoute | null => {
	const routing = props.collection.getData.routing;
	if (!routing || !props.fields) return null;

	const pathField = props.fields.find((field) => field.key === routing.field);
	if (!pathField) return null;

	const path = resolvePathValue(pathField, props.locales);
	if (
		path === null ||
		(typeof path === "object" && Object.values(path).every((value) => !value))
	) {
		return null;
	}

	const fallbackLabel = getDocumentFallbackLabel(
		props.collection,
		props.documentId,
	);
	const labelConfig = getDocumentLabelField(props.collection);
	const labelField = props.fields.find(
		(field) => field.key === labelConfig?.key,
	);
	let label: DocumentRoute["label"] = fallbackLabel;
	if (labelConfig && labelField?.translations) {
		label = Object.fromEntries(
			props.locales.map((locale) => [
				locale,
				formatDocumentLabelValue(
					labelConfig,
					labelField.translations?.[locale],
				) ?? fallbackLabel,
			]),
		);
	} else if (labelConfig && labelField) {
		label =
			formatDocumentLabelValue(labelConfig, labelField.value) ?? fallbackLabel;
	}

	return {
		path,
		label,
	};
};

/** Reads a localized route with all locale paths in `alternates`, listing shared paths under every locale. */
export const localizeDocumentRoute = (
	route: DocumentRoute | null,
	read: ContentReadLocale | null,
	locales: string[],
): LocalizedDocumentRoute | null => {
	if (!route) return null;

	const { path, label } = route;
	return {
		path:
			typeof path === "string"
				? path
				: read
					? (formatter.pickTranslation(path, read) as string | null)
					: null,
		label:
			typeof label === "string"
				? label
				: read
					? (formatter.pickTranslation(label, read) as string | null)
					: null,
		alternates:
			typeof path === "string"
				? Object.fromEntries(locales.map((code) => [code, path]))
				: path,
	};
};

export default formatDocumentRoute;

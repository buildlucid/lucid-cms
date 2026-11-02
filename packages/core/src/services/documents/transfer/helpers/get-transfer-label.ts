import type CollectionBuilder from "../../../../libs/collection/builders/collection-builder/index.js";
import {
	formatDocumentLabelValue,
	getDocumentLabelField,
} from "../../../../libs/collection/helpers/document-label.js";
import type { DocumentEditableData } from "../../../../libs/toolkit/documents/types.js";
import isPlainObject from "../../../../utils/helpers/is-plain-object.js";
import type { ServiceContext } from "../../../../utils/services/types.js";

/** Labels an exported document from its label field, preferring the default locale, or its collection name and ID. */
const getTransferLabel = (
	context: ServiceContext,
	props: {
		collection: CollectionBuilder;
		data: DocumentEditableData;
		documentId: number;
	},
) => {
	const field = getDocumentLabelField(props.collection);
	const raw = field ? props.data.fields[field.key] : undefined;
	const defaultLocale = context.config.localization.defaultLocale;
	const value = isPlainObject(raw)
		? ((defaultLocale ? raw[defaultLocale] : undefined) ??
			Object.values(raw).find((item) => item !== null && item !== ""))
		: raw;
	const label = field ? formatDocumentLabelValue(field, value) : null;
	if (label) return label;

	const labels = props.collection.getData.details.labels;
	const name =
		context.translate(labels.singular) ||
		context.translate(labels.plural) ||
		props.collection.key;
	return `${name} #${props.documentId}`;
};

export default getTransferLabel;

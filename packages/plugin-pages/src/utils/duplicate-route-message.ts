import type { CollectionBuilder } from "@lucidcms/core";
import { copy } from "@lucidcms/core/plugin";
import type { ErrorCopy, ServiceFn } from "@lucidcms/core/types";

type Translate = Parameters<ServiceFn<[], undefined>>[0]["translate"];
type UniqueFieldLabelSource = {
	key: string;
};

export const formatUniqueFieldList = (fields: string[]) => {
	return fields.filter((field) => field.length > 0).join(", ");
};

export const resolveUniqueFieldLabel = (data: {
	translate: Translate;
	collection: CollectionBuilder;
	field: UniqueFieldLabelSource;
}) => {
	const label = data.collection.fields.get(data.field.key)?.details?.label;
	if (typeof label === "string") return label.trim() || data.field.key;

	const translatedLabel = label ? data.translate(label) : undefined;
	return translatedLabel?.trim() || data.field.key;
};

const getDuplicateRouteMessage = (data: {
	translate: Translate;
	collectionInstance: CollectionBuilder;
	uniqueFields: UniqueFieldLabelSource[];
	duplicateMessage?: ErrorCopy;
}) => {
	if (data.duplicateMessage) return data.duplicateMessage;

	if (data.uniqueFields.length === 0) {
		return copy("server:plugin.pages.full.slug.duplicate");
	}

	return copy("server:plugin.pages.full.slug.duplicate.with.fields", {
		data: {
			fields: formatUniqueFieldList(
				data.uniqueFields.map((field) =>
					resolveUniqueFieldLabel({
						translate: data.translate,
						collection: data.collectionInstance,
						field,
					}),
				),
			),
		},
	});
};

export default getDuplicateRouteMessage;

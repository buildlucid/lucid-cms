import type { CFConfig, FieldTypes, CollectionResponse } from "@types";
import { FaSolidT, FaSolidUser } from "solid-icons/fa";
import helpers from "@/utils/helpers";

export const tableHeadColumns = (fields: CFConfig<FieldTypes>[]) => {
	return fields.map((field) => {
		switch (field.type) {
			case "user":
				return {
					label: helpers.getLocaleValue({
						value: field.details.label,
						fallback: field.key,
					}),
					key: field.key,
					icon: <FaSolidUser />,
				};
			default: {
				return {
					label: helpers.getLocaleValue({
						value: field.details.label,
						fallback: field.key,
					}),
					key: field.key,
					icon: <FaSolidT />,
				};
			}
		}
	});
};

export const collectionFieldFilters = (collection?: CollectionResponse) => {
	const fieldsRes: CFConfig<FieldTypes>[] = [];

	const fieldRecursive = (fields?: CFConfig<FieldTypes>[]) => {
		if (!fields) return;
		for (const field of fields) {
			if (field.type === "repeater" && field.fields) {
				fieldRecursive(field.fields);
				return;
			}
			if (collection?.config.fieldFilters.includes(field.key)) {
				fieldsRes.push(field);
			}
		}
	};
	fieldRecursive(collection?.fields);

	return fieldsRes;
};

export const collectionFieldIncludes = (collection?: CollectionResponse) => {
	const fieldsRes: CFConfig<FieldTypes>[] = [];

	const fieldRecursive = (fields?: CFConfig<FieldTypes>[]) => {
		if (!fields) return;
		for (const field of fields) {
			if (field.type === "repeater" && field.fields) {
				fieldRecursive(field.fields);
				return;
			}
			if (collection?.config.fieldIncludes.includes(field.key)) {
				fieldsRes.push(field);
			}
		}
	};
	fieldRecursive(collection?.fields);

	return fieldsRes;
};

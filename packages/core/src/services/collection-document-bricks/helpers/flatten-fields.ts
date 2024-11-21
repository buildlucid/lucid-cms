import { v4 as uuidv4 } from "uuid";
import type {
	FieldSchemaType,
	FieldSchemaSimpleType,
	FieldValueSchemaType,
} from "../../../schemas/collection-fields.js";
import type { Config } from "../../../exports/types.js";
import type { BooleanInt } from "../../../libs/db/types.js";
import type CollectionBuilder from "../../../libs/builders/collection-builder/index.js";

export interface FieldInsertItem {
	key: FieldSchemaType["key"];
	type: FieldSchemaType["type"];
	value: FieldValueSchemaType;
	localeCode: string;
	groupRef?: string;
	groupId?: number | string;
}
export interface GroupInsertItem {
	ref: string;
	order: number;
	repeater: string;
	open: BooleanInt;
	parentGroupRef?: string;
}

interface FlatFieldsResposne {
	fields: Array<FieldInsertItem>;
	groups: Array<GroupInsertItem>;
}

const flattenFields = (
	fields: FieldSchemaType[] | FieldSchemaSimpleType[],
	localisation: Config["localisation"],
	collection: CollectionBuilder,
): FlatFieldsResposne => {
	const fieldsRes: Array<FieldInsertItem> = [];
	const groupsRes: Array<GroupInsertItem> = [];

	// recursive function to parse fields
	const parseFields = (
		fields: FieldSchemaType[] | FieldSchemaSimpleType[],
		groupMeta?: {
			id?: number | string;
			ref?: string;
			repeaterKey?: string;
		},
	) => {
		// for each field, add to the fiedls array.
		// if its a repeater, store current repeater ref and pass it to the next level
		for (let i = 0; i < fields.length; i++) {
			const field = fields[i];
			if (field === undefined) continue;

			if (field.type === "repeater") {
				const repeaterKey = field.key;

				if (field.groups === undefined) continue;

				for (let j = 0; j < field.groups.length; j++) {
					const groupFields = field.groups[j];
					if (groupFields === undefined) continue;

					const groupRef = uuidv4();

					if (Array.isArray(groupFields)) {
						groupsRes.push({
							ref: groupRef,
							order: j,
							repeater: repeaterKey,
							open: 0,
							parentGroupRef: groupMeta?.ref,
						});
						parseFields(groupFields, {
							ref: groupRef,
							repeaterKey,
						});
						continue;
					}

					groupsRes.push({
						ref: groupRef,
						order: groupFields.order || j,
						open: groupFields.open || 0,
						repeater: repeaterKey,
						parentGroupRef: groupMeta?.ref,
					});
					parseFields(groupFields.fields, {
						id: groupFields.id,
						ref: groupRef,
						repeaterKey,
					});
				}

				continue;
			}

			if (
				field.translations &&
				collection.data.config.useTranslations === true
			) {
				for (let i = 0; i < localisation.locales.length; i++) {
					const locale = localisation.locales[i];
					if (!locale) continue;

					fieldsRes.push({
						key: field.key,
						type: field.type,
						value: field.translations[locale.code],
						localeCode: locale.code,
						groupId: groupMeta?.id,
						groupRef: groupMeta?.ref,
					});
				}
			} else {
				const code = localisation.locales.find(
					(l) => l.code === localisation.defaultLocale,
				)?.code;
				if (!code) return;

				fieldsRes.push({
					key: field.key,
					type: field.type,
					value: field.value,
					localeCode: code,
					groupId: groupMeta?.id,
					groupRef: groupMeta?.ref,
				});
			}
		}
	};
	parseFields(fields);

	return {
		fields: fieldsRes,
		groups: groupsRes,
	};
};

export default flattenFields;

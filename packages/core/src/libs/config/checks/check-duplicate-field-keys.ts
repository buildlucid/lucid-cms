import { translate } from "../../i18n/index.js";

const checkDuplicateFieldKeys = (
	type: "brick" | "collection",
	typeKey: string,
	fieldsKeys: string[],
) => {
	const duplicateKeys = fieldsKeys.filter((key, index, array) => {
		return array.indexOf(key) !== index;
	});

	if (duplicateKeys.length > 0) {
		throw new Error(
			translate("server:core.collections.fields.duplicates", {
				data: {
					type: type,
					keys: duplicateKeys.join(", "),
					typeKey: typeKey,
				},
			}),
		);
	}
};

export default checkDuplicateFieldKeys;

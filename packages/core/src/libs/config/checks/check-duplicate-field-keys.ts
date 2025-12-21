import T from "../../../translations/index.js";

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
			T("duplicate_field_keys_message", {
				type: type,
				keys: duplicateKeys.join(", "),
				typeKey: typeKey,
			}),
		);
	}
};

export default checkDuplicateFieldKeys;

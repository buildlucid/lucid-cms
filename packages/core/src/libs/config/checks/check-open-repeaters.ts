import { translate } from "../../i18n/index.js";

const checkOpenRepeaters = (
	type: "brick" | "collection",
	typeKey: string,
	repeaterStack: string[],
) => {
	if (repeaterStack.length === 0) return;

	throw new Error(
		translate("server:core.fields.repeater.validation.unclosed", {
			data: {
				keys: repeaterStack.join(", "),
				type,
				typeKey,
			},
		}),
	);
};

export default checkOpenRepeaters;

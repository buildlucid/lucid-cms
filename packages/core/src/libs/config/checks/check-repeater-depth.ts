import constants from "../../../constants/constants.js";
import { translateServer } from "../../i18n/index.js";

const checkRepeaterDepth = (
	type: "brick" | "collection",
	typeKey: string,
	repeaterDepth: Record<string, number>,
) => {
	for (const [repeaterKey, depth] of Object.entries(repeaterDepth)) {
		if (depth > constants.fieldBuiler.maxRepeaterDepth) {
			throw new Error(
				translateServer("core.fields.repeater.validation.depth.message", {
					type: type,
					typeKey: typeKey,
					repeaterKey: repeaterKey,
					depth: depth,
					maxRepeaterDepth: constants.fieldBuiler.maxRepeaterDepth,
				}),
			);
		}
	}
};

export default checkRepeaterDepth;

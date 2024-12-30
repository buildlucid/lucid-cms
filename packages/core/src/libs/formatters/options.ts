import { boolean } from "../../utils/helpers/index.js";
import type { LucidOptions, Select } from "../db/types.js";
import type { OptionsResponse } from "../../types/response.js";

export default class OptionsFormatter {
	formatSingle = (props: {
		option: Select<LucidOptions>;
	}): OptionsResponse => {
		return {
			name: props.option.name,
			valueText: props.option.value_text,
			valueInt: props.option.value_int,
			valueBool: boolean.responseFormat(props.option.value_bool),
		};
	};
}

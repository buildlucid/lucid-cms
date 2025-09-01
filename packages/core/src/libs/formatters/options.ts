import Formatter from "./index.js";
import type { LucidOptions, Select } from "../db/types.js";
import type { OptionsResponse } from "../../types/response.js";

export default class OptionsFormatter {
	formatMultiple = (props: {
		options: Select<LucidOptions>[];
	}): OptionsResponse[] => {
		return props.options.map((o) => this.formatSingle({ option: o }));
	};
	formatSingle = (props: {
		option: Select<LucidOptions>;
	}): OptionsResponse => {
		return {
			name: props.option.name,
			valueText: props.option.value_text,
			valueInt: props.option.value_int,
			valueBool: Formatter.formatBoolean(props.option.value_bool),
		};
	};
}

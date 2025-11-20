import formatter from "./index.js";
import type { LucidOptions, Select } from "../db-adapter/types.js";
import type { OptionsResponse } from "../../types/response.js";

const formatMultiple = (props: {
	options: Select<LucidOptions>[];
}): OptionsResponse[] => {
	return props.options.map((o) => formatSingle({ option: o }));
};

const formatSingle = (props: {
	option: Select<LucidOptions>;
}): OptionsResponse => {
	return {
		name: props.option.name,
		valueText: props.option.value_text,
		valueInt: props.option.value_int,
		valueBool: formatter.formatBoolean(props.option.value_bool),
	};
};

export default {
	formatMultiple,
	formatSingle,
};

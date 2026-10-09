import { createRelationValueFieldTypeGenerator } from "../../../type-gen/custom-field.js";
import { formatIntegerFilterValue } from "../../utils/filter-values.js";
import parseListToolValue from "../../utils/parse-list-tool-value.js";
import { relationFieldConfig } from "./config.js";
import RelationCustomField from "./custom-field.js";
import nullifyRelationReferences from "./nullify-references.js";
import validateRelationInputData from "./validate-input.js";

export default {
	config: relationFieldConfig,
	class: RelationCustomField,
	validateInput: validateRelationInputData,
	formatFilterValue: formatIntegerFilterValue,
	parseToolValue: parseListToolValue,
	nullifyReferences: nullifyRelationReferences,
	contentTypeGen: createRelationValueFieldTypeGenerator(),
};

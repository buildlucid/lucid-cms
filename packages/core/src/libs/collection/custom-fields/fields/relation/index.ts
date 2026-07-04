import { createRelationValueFieldTypeGenerator } from "../../../type-gen/custom-field.js";
import { createFieldRefFetchPlan } from "../../utils/ref-fetch.js";
import { relationFieldConfig } from "./config.js";
import RelationCustomField from "./custom-field.js";
import fetchRelationRefs from "./fetch-refs.js";
import formatRelationRef from "./format-ref.js";
import nullifyRelationReferences from "./nullify-references.js";
import validateRelationInputData from "./validate-input.js";

export default {
	config: relationFieldConfig,
	class: RelationCustomField,
	planFetchRefs: createFieldRefFetchPlan,
	fetchRefs: fetchRelationRefs,
	validateInput: validateRelationInputData,
	formatRef: formatRelationRef,
	nullifyReferences: nullifyRelationReferences,
	clientTypeGen: createRelationValueFieldTypeGenerator(),
};

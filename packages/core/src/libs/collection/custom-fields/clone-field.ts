import deepMerge from "../../../utils/helpers/deep-merge.js";
import type CustomField from "./custom-field.js";
import CheckboxCustomField from "./fields/checkbox/custom-field.js";
import CodeCustomField from "./fields/code/custom-field.js";
import CollapsibleCustomField from "./fields/collapsible/custom-field.js";
import ColorCustomField from "./fields/color/custom-field.js";
import DateTimeCF from "./fields/datetime/custom-field.js";
import JSONCF from "./fields/json/custom-field.js";
import LinkCustomField from "./fields/link/custom-field.js";
import MediaCustomField from "./fields/media/custom-field.js";
import NumberCustomField from "./fields/number/custom-field.js";
import RangeCustomField from "./fields/range/custom-field.js";
import RelationCustomField from "./fields/relation/custom-field.js";
import RepeaterCustomField from "./fields/repeater/custom-field.js";
import RichTextCustomField from "./fields/rich-text/custom-field.js";
import SectionCustomField from "./fields/section/custom-field.js";
import SelectCustomField from "./fields/select/custom-field.js";
import TabCustomField from "./fields/tab/custom-field.js";
import TextCustomField from "./fields/text/custom-field.js";
import TextareaCustomField from "./fields/textarea/custom-field.js";
import UserCustomField from "./fields/user/custom-field.js";
import type { FieldTypes } from "./types.js";

const cloneField = (
	field: CustomField<FieldTypes>,
): CustomField<FieldTypes> => {
	const config = deepMerge({}, field.config);
	const create = () => {
		switch (config.type) {
			case "checkbox":
				return new CheckboxCustomField(field.key, { ...config });
			case "code":
				return new CodeCustomField(field.key, { ...config });
			case "collapsible":
				return new CollapsibleCustomField(field.key, { ...config });
			case "color":
				return new ColorCustomField(field.key, { ...config });
			case "datetime":
				return new DateTimeCF(field.key, { ...config });
			case "json":
				return new JSONCF(field.key, { ...config });
			case "link":
				return new LinkCustomField(field.key, { ...config });
			case "media":
				return new MediaCustomField(field.key, { ...config });
			case "number":
				return new NumberCustomField(field.key, { ...config });
			case "range":
				return new RangeCustomField(field.key, { ...config });
			case "relation":
				return new RelationCustomField(field.key, { ...config });
			case "repeater":
				return new RepeaterCustomField(field.key, { ...config });
			case "rich-text":
				return new RichTextCustomField(field.key, { ...config });
			case "section":
				return new SectionCustomField(field.key, { ...config });
			case "select":
				return new SelectCustomField(field.key, { ...config });
			case "tab":
				return new TabCustomField(field.key, { ...config });
			case "text":
				return new TextCustomField(field.key, { ...config });
			case "textarea":
				return new TextareaCustomField(field.key, { ...config });
			case "user":
				return new UserCustomField(field.key, { ...config });
		}
	};
	const cloned = create();
	cloned.treeParent = field.treeParent;
	cloned.tabParent = field.tabParent;
	cloned.structuralParent = field.structuralParent;
	return cloned;
};

export default cloneField;

import type CustomField from "../../custom-fields/custom-field.js";
import CheckboxCustomField from "../../custom-fields/fields/checkbox/custom-field.js";
import CodeCustomField from "../../custom-fields/fields/code/custom-field.js";
import CollapsibleCustomField from "../../custom-fields/fields/collapsible/custom-field.js";
import ColorCustomField from "../../custom-fields/fields/color/custom-field.js";
import DateTimeCF from "../../custom-fields/fields/datetime/custom-field.js";
import EmailCustomField from "../../custom-fields/fields/email/custom-field.js";
import JSONCF from "../../custom-fields/fields/json/custom-field.js";
import LinkCustomField from "../../custom-fields/fields/link/custom-field.js";
import MediaCustomField from "../../custom-fields/fields/media/custom-field.js";
import NumberCustomField from "../../custom-fields/fields/number/custom-field.js";
import RangeCustomField from "../../custom-fields/fields/range/custom-field.js";
import RelationCustomField from "../../custom-fields/fields/relation/custom-field.js";
import RepeaterCustomField from "../../custom-fields/fields/repeater/custom-field.js";
import RichTextCustomField from "../../custom-fields/fields/rich-text/custom-field.js";
import SectionCustomField from "../../custom-fields/fields/section/custom-field.js";
import SelectCustomField from "../../custom-fields/fields/select/custom-field.js";
import TabCustomField from "../../custom-fields/fields/tab/custom-field.js";
import TextCustomField from "../../custom-fields/fields/text/custom-field.js";
import TextareaCustomField from "../../custom-fields/fields/textarea/custom-field.js";
import UserCustomField from "../../custom-fields/fields/user/custom-field.js";
import type { FieldTypes } from "../../custom-fields/types.js";
import type { FieldNode } from "./types.js";

/** Creates the field instance a node describes. Child fields are placed by the field set, not held by the instance. */
const createField = (node: FieldNode): CustomField<FieldTypes> => {
	switch (node.type) {
		case "checkbox":
			return new CheckboxCustomField(node.key, node.options);
		case "code":
			return new CodeCustomField(node.key, node.options);
		case "collapsible": {
			const { fields: _fields, ...options } = node.options;
			return new CollapsibleCustomField(node.key, options);
		}
		case "color":
			return new ColorCustomField(node.key, node.options);
		case "datetime":
			return new DateTimeCF(node.key, node.options);
		case "email":
			return new EmailCustomField(node.key, node.options);
		case "json":
			return new JSONCF(node.key, node.options);
		case "link":
			return new LinkCustomField(node.key, node.options);
		case "media":
			return new MediaCustomField(node.key, node.options);
		case "number":
			return new NumberCustomField(node.key, node.options);
		case "range":
			return new RangeCustomField(node.key, node.options);
		case "relation":
			return new RelationCustomField(node.key, node.options);
		case "repeater": {
			const { fields: _fields, ...options } = node.options;
			return new RepeaterCustomField(node.key, options);
		}
		case "rich-text":
			return new RichTextCustomField(node.key, node.options);
		case "section": {
			const { fields: _fields, ...options } = node.options;
			return new SectionCustomField(node.key, options);
		}
		case "select":
			return new SelectCustomField(node.key, node.options);
		case "tab": {
			const { fields: _fields, ...options } = node.options;
			return new TabCustomField(node.key, options);
		}
		case "text":
			return new TextCustomField(node.key, node.options);
		case "textarea":
			return new TextareaCustomField(node.key, node.options);
		case "user":
			return new UserCustomField(node.key, node.options);
	}
};

export default createField;

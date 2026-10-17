import isRecord from "../utils/is-record.js";
import { fieldTargets } from "./field-targets.js";
import type {
	TemplateBrick,
	TemplateDocument,
} from "./to-template-document.js";

const templateTypes = {
	Document: (value: unknown): value is TemplateDocument =>
		isRecord(value) && fieldTargets.has(value) && "collectionKey" in value,
	Brick: (value: unknown): value is TemplateBrick =>
		isRecord(value) &&
		fieldTargets.has(value) &&
		"key" in value &&
		"fields" in value &&
		!("collectionKey" in value),
};

export default templateTypes;

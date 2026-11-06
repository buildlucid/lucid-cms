import { createHash } from "node:crypto";
import type { TranslationText } from "../collection/custom-fields/types.js";

/** Hashes translation text, so a translation can tell when the text it was made from changes. */
const hashTranslationText = (text: TranslationText): string =>
	createHash("sha256")
		.update(`${text.format}\n${text.text}`)
		.digest("hex")
		.slice(0, 32);

export default hashTranslationText;

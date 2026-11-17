import { uploads } from "../../constants.js";
import readNumber from "../../shared/read-number.js";
import type { FormField } from "../../types.js";

/** The largest file a field takes, in whole bytes: its own `maxSizeMb`, capped by what the config lets anyone upload. */
const resolveMaxBytes = (formField: FormField, uploadBytes: number) => {
	const maxSizeMb = readNumber(formField.settings, "maxSizeMb");
	return maxSizeMb === undefined || maxSizeMb <= 0
		? uploadBytes
		: Math.min(Math.floor(maxSizeMb * uploads.bytesPerMb), uploadBytes);
};

export default resolveMaxBytes;

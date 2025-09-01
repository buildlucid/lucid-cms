import type { BooleanInt } from "../../types.js";
import type { LicenseResponse } from "../../types/response.js";
import Formatter from "./index.js";

interface LicensePropsT {
	key: string | null;
	valid: BooleanInt;
	lastChecked: number | null;
	errorMessage: string | null;
}

export default class LicenseFormatter {
	formatSingle = (props: {
		license: LicensePropsT;
	}): LicenseResponse => {
		return {
			key: LicenseFormatter.obfuscateLicenseKey(props.license.key),
			valid: Formatter.formatBoolean(props.license.valid),
			lastChecked: props.license.lastChecked,
			errorMessage: props.license.errorMessage,
		};
	};
	static obfuscateLicenseKey = (key: string | null | undefined) => {
		if (!key) return null;
		if (key.length <= 4) return key;
		const visible = key.slice(-4);
		return "*".repeat(key.length - 4) + visible;
	};
}

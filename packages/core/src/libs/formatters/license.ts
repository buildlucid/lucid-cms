import type { BooleanInt } from "../../types.js";
import type { LicenseResponse } from "../../types/response.js";
import formatter from "./index.js";

interface LicensePropsT {
	last4: string | null;
	valid: BooleanInt;
	lastChecked: number | null;
	errorMessage: string | null;
}

const formatSingle = (props: {
	license: LicensePropsT;
}): LicenseResponse => {
	return {
		key: createLicenseKeyFromLast4(props.license.last4),
		valid: formatter.formatBoolean(props.license.valid),
		lastChecked: props.license.lastChecked,
		errorMessage: props.license.errorMessage,
	};
};

const createLicenseKeyFromLast4 = (key: string | null | undefined) => {
	if (!key) return null;
	return `******-************-***************-****************-****${key}`;
};

export default {
	formatSingle,
	createLicenseKeyFromLast4,
};

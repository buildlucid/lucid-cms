import type { License } from "../../types/response.js";
import type { BooleanInt } from "../../types.js";
import { createLicenseKeyDisplay } from "../../utils/helpers/license-key-display.js";
import formatter from "./index.js";

interface LicensePropsT {
	key: string | null;
	valid: BooleanInt;
	lastChecked: number | null;
	errorMessage: string | null;
	aiEnabled: BooleanInt;
}

const formatSingle = (props: { license: LicensePropsT }): License => {
	return {
		key: createLicenseKeyDisplay(props.license.key),
		valid: formatter.formatBoolean(props.license.valid),
		lastChecked: props.license.lastChecked,
		errorMessage: props.license.errorMessage,
		ai: {
			enabled: formatter.formatBoolean(props.license.aiEnabled),
		},
	};
};

export default {
	formatSingle,
	createLicenseKeyDisplay,
};

import type { ServiceFn } from "../../utils/services/types.js";
import verifyLicense from "../license/verify.js";

const verifyLicenseCron: ServiceFn<[], undefined> = async (context) => {
	const verifyRes = await verifyLicense(context);
	if (verifyRes.error) return verifyRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default verifyLicenseCron;

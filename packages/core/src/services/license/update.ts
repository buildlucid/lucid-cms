import type { ServiceFn } from "../../utils/services/types.js";

const updateLicense: ServiceFn<
	[
		{
			licenseKey: string | null;
		},
	],
	undefined
> = async (context, data) => {
	const res = await context.services.option.upsertSingle(context, {
		name: "license_key",
		valueText: data.licenseKey,
	});
	if (res.error) return res;

	const verifyRes = await context.services.license.verifyLicense(context);
	if (verifyRes.error) return verifyRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default updateLicense;

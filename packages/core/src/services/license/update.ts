import { licenseFormatter } from "../../libs/formatters/index.js";
import { OptionsRepository } from "../../libs/repositories/index.js";
import { encrypt } from "../../utils/helpers/encrypt-decrypt.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { licenseServices } from "../index.js";

const updateLicense: ServiceFn<
	[
		{
			licenseKey: string | null;
		},
	],
	undefined
> = async (context, data) => {
	const Options = new OptionsRepository(context.db.client, context.config.db);

	const plain = data.licenseKey?.trim() || null;
	const display = licenseFormatter.createLicenseKeyDisplay(plain);
	const encrypted = plain
		? encrypt(plain, context.config.secrets.encryption)
		: null;

	const [keyRes, displayRes] = await Promise.all([
		Options.upsertSingle({
			data: {
				name: "license_key",
				value_text: encrypted,
			},
		}),
		Options.upsertSingle({
			data: {
				name: "license_key_display",
				value_text: display,
			},
		}),
	]);
	if (keyRes.error) return keyRes;
	if (displayRes.error) return displayRes;

	const verifyRes = await licenseServices.verifyLicense(context);
	if (verifyRes.error) return verifyRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default updateLicense;

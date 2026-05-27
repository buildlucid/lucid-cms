import { OptionsRepository } from "../../libs/repositories/index.js";
import T from "../../translations/index.js";
import { decrypt } from "../../utils/helpers/encrypt-decrypt.js";
import type { ServiceFn } from "../../utils/services/types.js";

const getLicenseKey: ServiceFn<[], string> = async (context) => {
	const Options = new OptionsRepository(context.db.client, context.config.db);

	const licenseKeyRes = await Options.selectSingle({
		select: ["name", "value_text"],
		where: [
			{
				key: "name",
				operator: "=",
				value: "license_key",
			},
		],
	});
	if (licenseKeyRes.error) return licenseKeyRes;

	const encryptedKey = licenseKeyRes.data?.value_text;
	const licenseKey = encryptedKey
		? decrypt(encryptedKey, context.config.secrets.encryption)
		: undefined;

	if (!licenseKey?.trim()) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: T("license_is_not_set"),
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: licenseKey,
	};
};

export default getLicenseKey;

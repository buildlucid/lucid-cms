import type { ServiceFn } from "../../utils/services/types.js";
import { encrypt } from "../../utils/helpers/encrypt-decrypt.js";
import { OptionsRepository } from "../../libs/repositories/index.js";
import { licenseServices } from "../index.js";

const updateLicense: ServiceFn<
	[
		{
			licenseKey: string | null;
		},
	],
	undefined
> = async (context, data) => {
	const Options = new OptionsRepository(context.db, context.config.db);

	const plain = data.licenseKey?.trim() || null;
	const last4 = plain ? plain.slice(-4) : null;
	const encrypted = plain
		? encrypt(plain, context.config.keys.encryptionKey)
		: null;

	const [keyRes, last4Res] = await Promise.all([
		Options.upsertSingle({
			data: {
				name: "license_key",
				value_text: encrypted,
			},
		}),
		Options.upsertSingle({
			data: {
				name: "license_key_last4",
				value_text: last4,
			},
		}),
	]);
	if (keyRes.error) return keyRes;
	if (last4Res.error) return last4Res;

	const verifyRes = await licenseServices.verifyLicense(context);
	if (verifyRes.error) return verifyRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default updateLicense;

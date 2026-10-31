import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import type { ServiceFn } from "../../../utils/services/types.js";
import withTransaction from "../../../utils/services/with-transaction.js";
import savePasskey from "./save-passkey.js";
import verifyRegistration from "./verify-registration.js";

/** Run without a transaction so failed verification leaves the challenge consumed. */
const register: ServiceFn<
	[
		{
			userId: number;
			response: RegistrationResponseJSON;
		},
	],
	{
		id: number;
		name: string;
	}
> = async (context, data) => {
	const verifyRes = await verifyRegistration(context, data);
	if (verifyRes.error) return verifyRes;

	return withTransaction(context, (context) =>
		savePasskey(context, {
			userId: data.userId,
			passkey: verifyRes.data,
		}),
	);
};

export default register;

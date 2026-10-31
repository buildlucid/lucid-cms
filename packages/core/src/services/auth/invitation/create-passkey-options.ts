import type { PublicKeyCredentialCreationOptionsJSON } from "@simplewebauthn/server";
import type { ServiceFn } from "../../../utils/services/types.js";
import createRegistrationOptions from "../passkeys/create-registration-options.js";
import getPendingInvitation from "./helpers/get-pending-invitation.js";

/** Creates the options for accepting an invitation with a passkey instead of a password. */
const createPasskeyOptions: ServiceFn<
	[
		{
			token: string;
		},
	],
	PublicKeyCredentialCreationOptionsJSON
> = async (context, data) => {
	const invitationRes = await getPendingInvitation(context, {
		token: data.token,
	});
	if (invitationRes.error) return invitationRes;

	return createRegistrationOptions(context, {
		userId: invitationRes.data.userId,
	});
};

export default createPasskeyOptions;

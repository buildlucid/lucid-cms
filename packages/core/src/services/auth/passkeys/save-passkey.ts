import constants from "../../../constants/constants.js";
import type { BuiltInEmailTemplates } from "../../../libs/email/types.js";
import {
	UserPasskeysRepository,
	UsersRepository,
} from "../../../libs/repositories/index.js";
import { formatEmailSubject } from "../../../utils/helpers/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import sendEmail from "../../email/send-email.js";
import logSecurityAudit from "../../security-audit/log-security-audit.js";
import getDefaultPasskeyName from "./helpers/default-name.js";
import type { VerifiedPasskey } from "./verify-registration.js";

/** Run in a transaction. Saves the verified passkey, logs the change and emails the user. */
const savePasskey: ServiceFn<
	[
		{
			userId: number;
			passkey: VerifiedPasskey;
		},
	],
	{
		id: number;
		name: string;
	}
> = async (context, data) => {
	// Defer WebAuthn loading until needed.
	const { isoBase64URL } = await import("@simplewebauthn/server/helpers");
	const Users = new UsersRepository(context.db);
	const Passkeys = new UserPasskeysRepository(context.db);
	const { credential, aaguid, credentialBackedUp } = data.passkey;

	const name = getDefaultPasskeyName(context, {
		aaguid: aaguid,
		transports: credential.transports,
	});

	const [userRes, createRes] = await Promise.all([
		Users.selectSingle({
			select: ["email", "first_name"],
			where: [
				{
					key: "id",
					operator: "=",
					value: data.userId,
				},
			],
			validation: {
				enabled: true,
			},
		}),
		Passkeys.createSingle({
			data: {
				user_id: data.userId,
				credential_id: credential.id,
				public_key: isoBase64URL.fromBuffer(credential.publicKey),
				counter: credential.counter,
				transports: credential.transports ?? null,
				backed_up: credentialBackedUp,
				aaguid: aaguid,
				name: name,
			},
			returning: ["id"],
			validation: {
				enabled: true,
			},
		}),
	]);
	if (userRes.error) return userRes;
	if (createRes.error) return createRes;

	const [auditRes, emailRes] = await Promise.all([
		logSecurityAudit(context, {
			userId: data.userId,
			action: constants.securityAudit.actions.passkeyChange,
			performedBy: data.userId,
			previousValue: "",
			newValue: name,
		}),
		sendEmail(context, {
			template: constants.email.templates.passkeyAdded.key,
			type: "internal",
			to: userRes.data.email,
			subject: (emailData) =>
				formatEmailSubject(
					context.translate("server:core.email.passkey.added.subject"),
					emailData.context.brand.name,
				),
			data: {
				firstName: userRes.data.first_name,
				passkeyName: name,
			} satisfies BuiltInEmailTemplates["passkey-added"],
		}),
	]);
	if (auditRes.error) return auditRes;
	if (emailRes.error) return emailRes;

	return {
		error: undefined,
		data: {
			id: createRes.data.id,
			name: name,
		},
	};
};

export default savePasskey;

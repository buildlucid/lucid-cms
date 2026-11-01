import { copy } from "../../../libs/i18n/index.js";
import generateSecret from "../../../utils/helpers/generate-secret.js";
import hashSecret from "../../../utils/helpers/hash-secret.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import checkPasswordRules from "../../auth/checks/check-password-rules.js";
import verifyPassword from "../../auth/verify-password.js";

const checkPassed = (value: string | undefined) => {
	return value !== undefined && value.trim() !== "";
};

/** Checks a password change, counting a wrong current password. Run it outside a transaction. */
const checkUpdatePassword: ServiceFn<
	[
		{
			userId: number;
			encryptedSecret: string;
			password: string | null; // Stored password hash
			currentPassword?: string;
			newPassword?: string;
			passwordConfirmation?: string;
			encryptionKey: string;
		},
	],
	{
		newPassword: string | undefined;
		triggerPasswordReset: boolean | undefined;
		encryptSecret: string | undefined;
	}
> = async (context, data) => {
	let newPassword: string | undefined;
	let triggerPasswordReset: boolean | undefined;

	if (
		checkPassed(data.newPassword) &&
		checkPassed(data.currentPassword) === false
	) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.input.provide.current.password"),
				status: 400,
				errors: {
					currentPassword: {
						code: "required",
						message: copy("server:core.input.provide.current.password"),
					},
				},
			},
			data: undefined,
		};
	}

	if (
		checkPassed(data.currentPassword) &&
		checkPassed(data.newPassword) === false
	) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.input.provide.new.password"),
				status: 400,
				errors: {
					newPassword: {
						code: "required",
						message: copy("server:core.input.provide.new.password"),
					},
				},
			},
			data: undefined,
		};
	}

	if (!checkPassed(data.newPassword) && !checkPassed(data.currentPassword)) {
		return {
			error: undefined,
			data: {
				newPassword: newPassword,
				triggerPasswordReset: triggerPasswordReset,
				encryptSecret: undefined,
			},
		};
	}

	const passwordRulesRes = await checkPasswordRules(context, {
		password: data.newPassword as string,
		field: "newPassword",
	});
	if (passwordRulesRes.error) return passwordRulesRes;

	if (data.newPassword !== data.passwordConfirmation) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.input.ensure.passwords.match"),
				status: 400,
				errors: {
					passwordConfirmation: {
						code: "invalid",
						message: copy("server:core.input.ensure.passwords.match"),
					},
				},
			},
			data: undefined,
		};
	}

	const passwordRes = await verifyPassword(context, {
		account: { userId: data.userId },
		password: data.currentPassword as string,
		stored: data.password
			? { password: data.password, secret: data.encryptedSecret }
			: null,
	});
	if (passwordRes.error) return passwordRes;
	if (!passwordRes.data) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.input.ensure.password.is.correct"),
				status: 400,
				errors: {
					currentPassword: {
						code: "invalid",
						message: copy("server:core.input.ensure.password.is.correct"),
					},
				},
			},
			data: undefined,
		};
	}

	const { secret, encryptSecret } = generateSecret(data.encryptionKey);

	newPassword = await hashSecret(data.newPassword as string, secret);

	triggerPasswordReset = false as const;

	return {
		error: undefined,
		data: {
			newPassword: newPassword,
			triggerPasswordReset: triggerPasswordReset,
			encryptSecret: encryptSecret,
		},
	};
};

export default checkUpdatePassword;

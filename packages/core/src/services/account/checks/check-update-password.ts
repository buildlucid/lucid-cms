import { copy } from "../../../libs/i18n/index.js";
import { decrypt } from "../../../utils/helpers/encrypt-decrypt.js";
import generateSecret from "../../../utils/helpers/generate-secret.js";
import hashSecret from "../../../utils/helpers/hash-secret.js";
import type { ServiceFn } from "../../../utils/services/types.js";

const checkPassed = (value: string | undefined) => {
	return value !== undefined && value.trim() !== "";
};

const checkUpdatePassword: ServiceFn<
	[
		{
			encryptedSecret: string;
			password: string; // the users hashed password
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
> = async (_, data) => {
	let newPassword: string | undefined;
	let triggerPasswordReset: boolean | undefined;

	// if current password is undefined/empty, and new password is passed
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

	// if current password is passed, but new password is not
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

	// if new password does not match password confirmation
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

	const decryptedSecret = decrypt(data.encryptedSecret, data.encryptionKey);
	const currentPasswordHash = await hashSecret(
		data.currentPassword as string,
		decryptedSecret,
	);

	const passwordValid = currentPasswordHash === data.password;

	if (!passwordValid) {
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

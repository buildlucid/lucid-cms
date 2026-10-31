import {
	browserSupportsWebAuthn,
	WebAuthnError,
} from "@simplewebauthn/browser";
import constants from "@/constants";
import T from "@/translations";
import { LucidError } from "@/utils/error-handling";
import { getLoginReturnPath } from "@/utils/login-route";

const PROMPT_PATH = "/admin/passkey";
const PROMPT_SNOOZED_UNTIL_KEY = "lucid_passkey_prompt_snoozed_until";

/**
 * Whether a passkey prompt ended without an answer: the user closed it, it
 * timed out, or another prompt replaced it. These need no error message.
 */
export const isPasskeyPromptCancelled = (error: unknown) => {
	if (!(error instanceof WebAuthnError)) return false;
	if (error.code === "ERROR_CEREMONY_ABORTED") return true;
	return error.cause instanceof Error && error.cause.name === "NotAllowedError";
};

/**
 * The toast for a passkey prompt that failed while using or adding a passkey.
 * API errors already show their own, and a closed prompt needs none.
 */
export const getPasskeyErrorToast = (error: unknown, action: "use" | "add") => {
	if (error instanceof LucidError || isPasskeyPromptCancelled(error)) {
		return undefined;
	}
	if (action === "use") {
		return {
			title: T()("toasts.auth.passkey.failed.title"),
			message: T()("toasts.auth.passkey.failed.message"),
		};
	}
	if (
		error instanceof WebAuthnError &&
		error.code === "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED"
	) {
		return {
			title: T()("toasts.account.passkey.exists.title"),
			message: T()("toasts.account.passkey.exists.message"),
		};
	}
	return {
		title: T()("toasts.account.passkey.failed.title"),
		message: T()("toasts.account.passkey.failed.message"),
	};
};

/**
 * Hides the prompt to add a passkey after logging in, on this browser, for a
 * while. Storage can be full or blocked, so this never stops a login going on.
 */
export const snoozePasskeyPrompt = () => {
	const days = constants.passkeys.promptSnoozeDays;
	try {
		localStorage.setItem(
			PROMPT_SNOOZED_UNTIL_KEY,
			String(Date.now() + days * 86_400_000),
		);
	} catch {}
};

const passkeyPromptSnoozed = () => {
	try {
		return Number(localStorage.getItem(PROMPT_SNOOZED_UNTIL_KEY)) > Date.now();
	} catch {
		return false;
	}
};

/**
 * Where a login goes next. Browsers that can make a passkey stop at the prompt
 * to add one first, unless it was put off lately. The prompt page checks the
 * rest, such as passkeys being on and the user having none yet.
 */
export const getPostLoginPath = (search: string) => {
	let returnPath = getLoginReturnPath(search);

	//* a login that started on the prompt, such as after the session ran out there, heads where the prompt was going
	const returnURL = new URL(returnPath, window.location.origin);
	if (returnURL.pathname === PROMPT_PATH) {
		returnPath = getLoginReturnPath(returnURL.search);
	}

	if (!browserSupportsWebAuthn() || passkeyPromptSnoozed()) return returnPath;

	//* provider logins send this to the server, so a path too long for it skips the prompt
	const promptPath = `${PROMPT_PATH}?${new URLSearchParams({ redirect: returnPath })}`;
	return promptPath.length > constants.redirectPathMaxLength
		? returnPath
		: promptPath;
};

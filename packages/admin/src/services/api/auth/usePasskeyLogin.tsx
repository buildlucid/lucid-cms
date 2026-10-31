import {
	type AuthenticationResponseJSON,
	type PublicKeyCredentialRequestOptionsJSON,
	sendSignal,
	startAuthentication,
} from "@simplewebauthn/browser";
import { useLocation, useNavigate } from "@solidjs/router";
import { useQueryClient } from "@tanstack/solid-query";
import type { ErrorResponse, ResponseBody } from "@types";
import T from "@/translations";
import { LucidError } from "@/utils/error-handling";
import { getLoginReturnPath } from "@/utils/login-route";
import { getPasskeyErrorToast } from "@/utils/passkeys";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	/** Offers passkeys in the username field's autofill instead of opening a prompt. */
	autofill?: boolean;
	/** Stops before the browser is asked, such as when another prompt opens first. */
	signal?: AbortSignal;
}

export const passkeyLoginOptionsReq = (params: Params) => {
	return request<ResponseBody<PublicKeyCredentialRequestOptionsJSON>>({
		url: "/api/v1/auth/passkey/options",
		csrf: true,
		method: "POST",
		signal: params.signal,
		//* autofill starts by itself, so it fails quietly and the form still works
		displayErrorToast: !params.autofill,
	});
};

export const passkeyLoginReq = (response: AuthenticationResponseJSON) => {
	return request<ResponseBody>({
		url: "/api/v1/auth/passkey/login",
		csrf: true,
		method: "POST",
		body: response,
	});
};

/**
 * Consumes the challenge before verification. Run without a transaction so failed checks cannot
 * reuse it.
 */
const loginWithPasskey = async (params: Params) => {
	const options = await passkeyLoginOptionsReq(params);
	//* asking the browser would cancel any prompt opened since, so stop if this one was called off
	params.signal?.throwIfAborted();
	const response = await startAuthentication({
		optionsJSON: options.data,
		useBrowserAutofill: params.autofill,
	});

	try {
		return await passkeyLoginReq(response);
	} catch (error) {
		//* tells the password manager to stop offering a passkey this site no longer has
		if (
			error instanceof LucidError &&
			error.errorRes.code === "passkey_unknown" &&
			options.data.rpId
		) {
			void sendSignal({
				signalName: "unknownCredential",
				rpID: options.data.rpId,
				credentialID: response.id,
			}).catch(() => undefined);
		}
		throw error;
	}
};

interface UsePasskeyLoginProps {
	onSuccess?: () => void;
	onError?: (_errors: ErrorResponse | undefined, _params: Params) => void;
}

const usePasskeyLogin = (props?: UsePasskeyLoginProps) => {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const location = useLocation();

	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<Params, ResponseBody>({
		mutationFn: loginWithPasskey,
		getSuccessToast: () => ({
			title: T()("toasts.common.login.success.title"),
			message: T()("toasts.common.login.success.message"),
		}),
		//* autofill starts by itself, so it fails quietly
		getErrorToast: (error, params) =>
			params.autofill ? undefined : getPasskeyErrorToast(error, "use"),
		onSuccess: () => {
			queryClient.clear();
			navigate(getLoginReturnPath(location.search));
			props?.onSuccess?.();
		},
		onError: props?.onError,
	});
};

export default usePasskeyLogin;

import {
	type AuthenticationResponseJSON,
	type PublicKeyCredentialRequestOptionsJSON,
	startAuthentication,
} from "@simplewebauthn/browser";
import { useLocation, useNavigate } from "@solidjs/router";
import { useQueryClient } from "@tanstack/solid-query";
import type { ErrorResponse, ResponseBody } from "@types";
import T from "@/translations";
import { getLoginReturnPath } from "@/utils/login-route";
import { getPasskeyErrorToast } from "@/utils/passkeys";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

export const twoFactorPasskeyOptionsReq = () => {
	return request<ResponseBody<PublicKeyCredentialRequestOptionsJSON>>({
		url: "/api/v1/auth/two-factor/passkey/options",
		csrf: true,
		method: "POST",
	});
};

export const verifyTwoFactorPasskeyReq = (
	response: AuthenticationResponseJSON,
) => {
	return request<ResponseBody>({
		url: "/api/v1/auth/two-factor/passkey/verify",
		csrf: true,
		method: "POST",
		body: response,
	});
};

/** Asks the browser for one of the user's passkeys, then finishes the login's two-factor step with it. */
const verifyWithPasskey = async () => {
	const options = await twoFactorPasskeyOptionsReq();
	const response = await startAuthentication({ optionsJSON: options.data });
	return verifyTwoFactorPasskeyReq(response);
};

interface UseVerifyTwoFactorPasskeyProps {
	onError?: (_errors: ErrorResponse | undefined) => void;
}

const useVerifyTwoFactorPasskey = (props?: UseVerifyTwoFactorPasskeyProps) => {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const location = useLocation();

	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<void, ResponseBody>({
		mutationFn: verifyWithPasskey,
		getSuccessToast: () => ({
			title: T()("toasts.common.login.success.title"),
			message: T()("toasts.common.login.success.message"),
		}),
		getErrorToast: (error) => getPasskeyErrorToast(error, "use"),
		onSuccess: () => {
			queryClient.clear();
			navigate(getLoginReturnPath(location.search));
		},
		onError: props?.onError,
	});
};

export default useVerifyTwoFactorPasskey;

import {
	type PublicKeyCredentialCreationOptionsJSON,
	type RegistrationResponseJSON,
	startRegistration,
} from "@simplewebauthn/browser";
import { useLocation, useNavigate } from "@solidjs/router";
import { useQueryClient } from "@tanstack/solid-query";
import type { ErrorResponse, ResponseBody } from "@types";
import T from "@/translations";
import { getLoginReturnPath } from "@/utils/login-route";
import { getPasskeyErrorToast } from "@/utils/passkeys";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

export const setupTwoFactorPasskeyReq = () => {
	return request<ResponseBody<PublicKeyCredentialCreationOptionsJSON>>({
		url: "/api/v1/auth/two-factor/passkey/setup",
		csrf: true,
		method: "POST",
	});
};

export const confirmTwoFactorPasskeyReq = (
	response: RegistrationResponseJSON,
) => {
	return request<ResponseBody>({
		url: "/api/v1/auth/two-factor/passkey/confirm",
		csrf: true,
		method: "POST",
		body: response,
	});
};

/** Asks the browser to make a passkey, then finishes the login's two-factor setup with it. */
const confirmWithPasskey = async () => {
	const options = await setupTwoFactorPasskeyReq();
	const response = await startRegistration({ optionsJSON: options.data });
	return confirmTwoFactorPasskeyReq(response);
};

interface UseConfirmTwoFactorPasskeyProps {
	onError?: (_errors: ErrorResponse | undefined) => void;
}

const useConfirmTwoFactorPasskey = (
	props?: UseConfirmTwoFactorPasskeyProps,
) => {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const location = useLocation();

	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<void, ResponseBody>({
		mutationFn: confirmWithPasskey,
		getSuccessToast: () => ({
			title: T()("toasts.common.login.success.title"),
			message: T()("toasts.common.login.success.message"),
		}),
		getErrorToast: (error) => getPasskeyErrorToast(error, "add"),
		onSuccess: () => {
			queryClient.clear();
			navigate(getLoginReturnPath(location.search));
		},
		onError: props?.onError,
	});
};

export default useConfirmTwoFactorPasskey;

import {
	type AuthenticationResponseJSON,
	type PublicKeyCredentialRequestOptionsJSON,
	startAuthentication,
} from "@simplewebauthn/browser";
import type { ResponseBody, TwoFactorProof } from "@types";
import { getPasskeyErrorToast } from "@/utils/passkeys";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

/** How the user confirms it's them. `passkey` asks the browser for one of their passkeys. */
type Params = TwoFactorProof | { password: string } | { passkey: true };

export const reauthenticateOptionsReq = () => {
	return request<ResponseBody<PublicKeyCredentialRequestOptionsJSON>>({
		url: "/api/v1/account/reauthenticate/options",
		csrf: true,
		method: "POST",
	});
};

export const reauthenticateReq = (
	body:
		| TwoFactorProof
		| { password: string }
		| { passkey: AuthenticationResponseJSON },
) => {
	return request<ResponseBody>({
		url: "/api/v1/account/reauthenticate",
		csrf: true,
		method: "POST",
		body,
	});
};

const reauthenticate = async (params: Params) => {
	if (!("passkey" in params)) return reauthenticateReq(params);

	const options = await reauthenticateOptionsReq();
	const response = await startAuthentication({ optionsJSON: options.data });
	return reauthenticateReq({ passkey: response });
};

interface UseReauthenticateProps {
	onSuccess?: () => void;
}

const useReauthenticate = (props?: UseReauthenticateProps) => {
	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<Params, ResponseBody>({
		mutationFn: reauthenticate,
		getErrorToast: (error, params) =>
			"passkey" in params ? getPasskeyErrorToast(error, "use") : undefined,
		onSuccess: () => props?.onSuccess?.(),
	});
};

export default useReauthenticate;

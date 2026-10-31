import {
	type PublicKeyCredentialCreationOptionsJSON,
	type RegistrationResponseJSON,
	startRegistration,
} from "@simplewebauthn/browser";
import { useNavigate } from "@solidjs/router";
import { useQueryClient } from "@tanstack/solid-query";
import type { ResponseBody } from "@types";
import T from "@/translations";
import { getPasskeyErrorToast } from "@/utils/passkeys";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	token: string;
}

export const invitationPasskeyOptionsReq = (params: Params) => {
	return request<ResponseBody<PublicKeyCredentialCreationOptionsJSON>>({
		url: `/api/v1/auth/invitation/accept/${params.token}/passkey/options`,
		csrf: true,
		method: "POST",
	});
};

export const acceptInvitationPasskeyReq = (
	params: Params & { response: RegistrationResponseJSON },
) => {
	return request<ResponseBody>({
		url: `/api/v1/auth/invitation/accept/${params.token}/passkey`,
		csrf: true,
		method: "POST",
		body: params.response,
	});
};

/** Asks the browser to make a passkey, then accepts the invitation with it instead of a password. */
const acceptWithPasskey = async (params: Params) => {
	const options = await invitationPasskeyOptionsReq(params);
	const response = await startRegistration({ optionsJSON: options.data });
	return acceptInvitationPasskeyReq({ token: params.token, response });
};

const useAcceptInvitationPasskey = () => {
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<Params, ResponseBody>({
		mutationFn: acceptWithPasskey,
		getSuccessToast: () => ({
			title: T()("toasts.common.login.success.title"),
			message: T()("toasts.common.login.success.message"),
		}),
		getErrorToast: (error) => getPasskeyErrorToast(error, "add"),
		//* the new passkey logs the user in, and they don't need asking to add one
		onSuccess: () => {
			queryClient.clear();
			navigate("/admin");
		},
	});
};

export default useAcceptInvitationPasskey;

import {
	type PublicKeyCredentialCreationOptionsJSON,
	type RegistrationResponseJSON,
	startRegistration,
} from "@simplewebauthn/browser";
import type { ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import { getPasskeyErrorToast } from "@/utils/passkeys";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

type CreatedPasskey = {
	id: number;
	name: string;
};

export const createPasskeyOptionsReq = () => {
	return request<ResponseBody<PublicKeyCredentialCreationOptionsJSON>>({
		url: "/api/v1/account/passkeys/options",
		csrf: true,
		method: "POST",
	});
};

export const createPasskeyReq = (response: RegistrationResponseJSON) => {
	return request<ResponseBody<CreatedPasskey>>({
		url: "/api/v1/account/passkeys",
		csrf: true,
		method: "POST",
		body: response,
	});
};

/** Asks the browser to make a passkey for this account, then saves it. */
const addPasskey = async () => {
	const options = await createPasskeyOptionsReq();
	const response = await startRegistration({ optionsJSON: options.data });
	return createPasskeyReq(response);
};

interface UseCreatePasskeyProps {
	onSuccess?: (_passkey: CreatedPasskey) => void;
	onError?: () => void;
}

const useCreatePasskey = (props?: UseCreatePasskeyProps) => {
	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<void, ResponseBody<CreatedPasskey>>({
		mutationFn: addPasskey,
		getSuccessToast: (res) => ({
			title: T()("toasts.account.passkey.added.title"),
			message: T()("toasts.account.passkey.added.message", {
				name: res.data.name,
			}),
		}),
		getErrorToast: (error) => getPasskeyErrorToast(error, "add"),
		invalidates: [queryKeys.account.session()],
		onSuccess: (res) => props?.onSuccess?.(res.data),
		onError: props?.onError,
	});
};

export default useCreatePasskey;

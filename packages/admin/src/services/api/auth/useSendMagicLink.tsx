import type { ResponseBody } from "@types";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	email: string;
	redirectPath?: string;
	captchaToken?: string;
}

export const sendMagicLinkReq = (params: Params) => {
	return request<ResponseBody>({
		url: "/api/v1/auth/magic-link",
		csrf: true,
		method: "POST",
		body: {
			email: params.email,
			redirectPath: params.redirectPath,
		},
		captchaToken: params.captchaToken,
	});
};

interface UseSendMagicLinkProps {
	onSuccess?: (_params: Params) => void;
	onError?: () => void;
}

const useSendMagicLink = (props?: UseSendMagicLinkProps) => {
	// -----------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<Params, ResponseBody>({
		mutationFn: sendMagicLinkReq,
		onSuccess: (_data, params) => {
			props?.onSuccess?.(params);
		},
		onError: props?.onError,
	});
};

export default useSendMagicLink;

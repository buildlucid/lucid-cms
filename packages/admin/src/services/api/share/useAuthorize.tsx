import type { ResponseBody } from "@types";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	token: string;
	body: {
		password: string;
	};
	captchaToken?: string;
}

const authorizeReq = (params: Params) => {
	return request<ResponseBody<{ success: boolean }>>({
		url: `/api/v1/share/${params.token}/authorize`,
		method: "POST",
		body: params.body,
		captchaToken: params.captchaToken,
	});
};

const useAuthorize = () => {
	return serviceHelpers.useMutationWrapper<
		Params,
		ResponseBody<{ success: boolean }>
	>({
		mutationFn: authorizeReq,
	});
};

export default useAuthorize;

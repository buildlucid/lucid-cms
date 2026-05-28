import type { ResponseBody } from "@types";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

type Params = Record<string, never>;

export const verifyReq = (_params: Params) => {
	return request<ResponseBody<undefined>>({
		url: "/lucid/api/v1/license/verify",
		csrf: true,
		config: {
			method: "POST",
		},
	});
};

const useVerify = () => {
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<undefined>>({
		mutationFn: verifyReq,
		getSuccessToast: () => ({
			title: T()("toasts.common.license.refresh.title"),
			message: T()("toasts.common.license.refresh.message"),
		}),
		invalidates: ["license.getStatus"],
	});
};

export default useVerify;

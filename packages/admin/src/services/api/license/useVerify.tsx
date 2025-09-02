import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import type { ResponseBody } from "@types";

type Params = Record<string, never>;

export const verifyReq = (_params: Params) => {
	return request<ResponseBody<undefined>>({
		url: "/api/v1/license/verify",
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
			title: T()("license_refresh_toast_title"),
			message: T()("license_refresh_toast_message"),
		}),
		invalidates: ["license.getStatus"],
	});
};

export default useVerify;

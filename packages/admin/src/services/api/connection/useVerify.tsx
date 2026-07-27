import type { ConnectionStatus, ResponseBody } from "@types";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

type Params = Record<string, never>;

export const verifyReq = (_params: Params) =>
	request<ResponseBody<ConnectionStatus>>({
		url: "/lucid/api/v1/connection/verify",
		csrf: true,
		config: {
			method: "POST",
		},
	});

const useVerify = () =>
	serviceHelpers.useMutationWrapper<Params, ResponseBody<ConnectionStatus>>({
		mutationFn: verifyReq,
		getSuccessToast: (response) =>
			response.data.status === "connected" && !response.data.warning
				? {
						title: T()("toasts.connection.verified.title"),
						message: T()("toasts.connection.verified.message"),
					}
				: undefined,
		invalidates: ["connection.getStatus"],
	});

export default useVerify;

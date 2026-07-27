import type { ResponseBody } from "@types";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

type Params = Record<string, never>;
type ConnectResponse = {
	authorizationUrl: string;
};

export const connectReq = (_params: Params) =>
	request<ResponseBody<ConnectResponse>>({
		url: "/lucid/api/v1/connection/connect",
		csrf: true,
		config: {
			method: "POST",
		},
	});

const useConnect = () =>
	serviceHelpers.useMutationWrapper<Params, ResponseBody<ConnectResponse>>({
		mutationFn: connectReq,
		onSuccess: (response) => {
			window.location.assign(response.data.authorizationUrl);
		},
	});

export default useConnect;

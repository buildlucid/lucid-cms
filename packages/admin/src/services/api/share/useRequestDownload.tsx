import type { ResponseBody } from "@types";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	token: string;
}

const requestDownloadReq = (params: Params) => {
	return request<ResponseBody<{ url: string | null }>>({
		url: `/lucid/api/v1/share/${params.token}/download`,
		config: {
			method: "POST",
		},
	});
};

const useRequestDownload = () => {
	return serviceHelpers.useMutationWrapper<
		Params,
		ResponseBody<{ url: string | null }>
	>({
		mutationFn: requestDownloadReq,
	});
};

export default useRequestDownload;

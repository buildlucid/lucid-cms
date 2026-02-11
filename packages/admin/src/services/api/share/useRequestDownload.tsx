import type { ResponseBody } from "@types";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	token: string;
}

interface UseRequestDownloadProps {
	onSuccess?: (data: ResponseBody<{ url: string }>) => void;
}

const requestDownloadReq = (params: Params) => {
	return request<ResponseBody<{ url: string }>>({
		url: `/lucid/api/v1/share/${params.token}/download`,
		config: {
			method: "POST",
		},
	});
};

const useRequestDownload = (props?: UseRequestDownloadProps) => {
	return serviceHelpers.useMutationWrapper<
		Params,
		ResponseBody<{ url: string }>
	>({
		mutationFn: requestDownloadReq,
		onSuccess: (data) => {
			if (data?.data?.url) {
				window.location.href = data.data.url;
			}
			props?.onSuccess?.(data);
		},
	});
};

export default useRequestDownload;

import type { ResponseBody } from "@types";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	id: number;
}

const requestDownloadReq = (params: Params) => {
	return request<ResponseBody<{ url: string }>>({
		url: `/lucid/api/v1/media/${params.id}/download`,
		csrf: true,
		config: {
			method: "POST",
		},
	});
};

const useRequestDownload = (props?: { onSuccess?: () => void }) => {
	return serviceHelpers.useMutationWrapper<
		Params,
		ResponseBody<{ url: string }>
	>({
		mutationFn: requestDownloadReq,
		onSuccess: (data) => {
			props?.onSuccess?.();
			if (data?.data?.url) {
				window.location.href = data.data.url;
			}
		},
	});
};

export default useRequestDownload;

import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";
import type { ResponseBody } from "@types";

interface Params {
	licenseKey: string | null;
}

export const updateReq = (params: Params) => {
	return request<ResponseBody<undefined>>({
		url: "/api/v1/license",
		csrf: true,
		config: {
			method: "PATCH",
			body: {
				licenseKey: params.licenseKey,
			},
		},
	});
};

interface UseUpdateProps {
	onSuccess?: () => void;
	onError?: () => void;
}

const useUpdate = (props?: UseUpdateProps) => {
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<undefined>>({
		mutationFn: updateReq,
		getSuccessToast: () => ({
			title: T()("update_toast_title", { name: T()("license") }),
			message: T()("license_update_toast_message"),
		}),
		invalidates: ["license.getStatus"],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useUpdate;

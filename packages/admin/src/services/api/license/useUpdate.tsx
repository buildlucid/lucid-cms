import type { ResponseBody } from "@types";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	licenseKey: string | null;
}

export const updateReq = (params: Params) => {
	return request<ResponseBody<undefined>>({
		url: "/lucid/api/v1/license",
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
			title: T()("toasts.common.update.title", { name: T()("common.license") }),
			message: T()("toasts.common.license.update.message"),
		}),
		invalidates: ["license.getStatus"],
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useUpdate;

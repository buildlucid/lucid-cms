import type { ResponseBody } from "@types";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

export const clearKVReq = () => {
	return request<ResponseBody<null>>({
		url: "/lucid/api/v1/settings/kv",
		csrf: true,
		config: {
			method: "DELETE",
		},
	});
};

interface UseClearKVProps {
	onSuccess?: () => void;
	onError?: () => void;
}

const useClearKV = (props: UseClearKVProps) => {
	return serviceHelpers.useMutationWrapper<unknown, ResponseBody<null>>({
		mutationFn: clearKVReq,
		getSuccessToast: () => ({
			title: T()("toasts.system.cache.title"),
			message: T()("toasts.system.cache.message"),
		}),
		invalidates: [],
		onSuccess: props.onSuccess,
		onError: props.onError,
	});
};

export default useClearKV;

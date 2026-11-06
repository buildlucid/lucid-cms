import type { ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	locale: string;
	body: { instructions: string };
}

export const updateStyleReq = (params: Params) => {
	return request<ResponseBody<null>>({
		url: `/api/v1/translations/styles/${encodeURIComponent(params.locale)}`,
		csrf: true,
		method: "PUT",
		body: params.body,
	});
};

/** Sets a language's style notes, which empty notes remove. */
const useUpdateStyle = (props?: { onSuccess?: () => void }) => {
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<null>>({
		mutationFn: updateStyleReq,
		getSuccessToast: () => ({
			title: T()("translations.styles.saved.title"),
			message: T()("translations.styles.saved.message"),
		}),
		invalidates: [queryKeys.translations.settings()],
		onSuccess: props?.onSuccess,
	});
};

export default useUpdateStyle;

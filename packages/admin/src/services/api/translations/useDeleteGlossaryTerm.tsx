import type { ResponseBody } from "@types";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	id: number;
}

export const deleteGlossaryTermReq = (params: Params) => {
	return request<ResponseBody<null>>({
		url: `/api/v1/translations/glossary/${params.id}`,
		csrf: true,
		method: "DELETE",
	});
};

/** Removes a glossary term. */
const useDeleteGlossaryTerm = (props?: { onSuccess?: () => void }) => {
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<null>>({
		mutationFn: deleteGlossaryTermReq,
		getSuccessToast: () => ({
			title: T()("toasts.common.deleted.title", {
				name: T()("translations.glossary.name"),
			}),
			message: T()("toasts.common.deleted.message", {
				name: T()("translations.glossary.name"),
			}),
		}),
		invalidates: [queryKeys.translations.settings()],
		onSuccess: props?.onSuccess,
	});
};

export default useDeleteGlossaryTerm;

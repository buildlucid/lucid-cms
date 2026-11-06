import type { ResponseBody, TranslationGlossaryTerm } from "@types";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	id: number;
	body: Omit<TranslationGlossaryTerm, "id">;
}

export const updateGlossaryTermReq = (params: Params) => {
	return request<ResponseBody<null>>({
		url: `/api/v1/translations/glossary/${params.id}`,
		csrf: true,
		method: "PATCH",
		body: params.body,
	});
};

/** Replaces a glossary term's term, language and translation. */
const useUpdateGlossaryTerm = (props?: { onSuccess?: () => void }) => {
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<null>>({
		mutationFn: updateGlossaryTermReq,
		getSuccessToast: () => ({
			title: T()("toasts.common.update.title", {
				name: T()("translations.glossary.name"),
			}),
			message: T()("toasts.common.update.message", {
				name: T()("translations.glossary.name"),
			}),
		}),
		invalidates: [queryKeys.translations.settings()],
		onSuccess: props?.onSuccess,
	});
};

export default useUpdateGlossaryTerm;

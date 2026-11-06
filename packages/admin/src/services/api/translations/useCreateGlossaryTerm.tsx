import type { ResponseBody, TranslationGlossaryTerm } from "@types";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	body: Omit<TranslationGlossaryTerm, "id">;
}

export const createGlossaryTermReq = (params: Params) => {
	return request<ResponseBody<null>>({
		url: "/api/v1/translations/glossary",
		csrf: true,
		method: "POST",
		body: params.body,
	});
};

/** Adds a glossary term every translation follows. */
const useCreateGlossaryTerm = (props?: { onSuccess?: () => void }) => {
	return serviceHelpers.useMutationWrapper<Params, ResponseBody<null>>({
		mutationFn: createGlossaryTermReq,
		getSuccessToast: () => ({
			title: T()("toasts.common.create.title", {
				name: T()("translations.glossary.name"),
			}),
			message: T()("toasts.common.create.message", {
				name: T()("translations.glossary.name"),
			}),
		}),
		invalidates: [queryKeys.translations.settings()],
		onSuccess: props?.onSuccess,
	});
};

export default useCreateGlossaryTerm;

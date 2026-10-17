import { queryKeys } from "@/services/query-keys";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

export type Params = {
	collectionKey: string;
	id: number;
	body: { environment: string; sourceVersionId?: number };
};
const usePublishSingle = () =>
	serviceHelpers.useMutationWrapper({
		mutationFn: (params: Params) =>
			request<undefined>({
				url: `/api/v1/documents/${params.collectionKey}/${params.id}/publish`,
				method: "POST",
				csrf: true,
				body: params.body,
			}),
		invalidates: [
			queryKeys.documents.all(),
			queryKeys.review.overview(),
			queryKeys.requests.all(),
		],
	});
export default usePublishSingle;

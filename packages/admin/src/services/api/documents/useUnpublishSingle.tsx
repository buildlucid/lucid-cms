import { queryKeys } from "@/services/query-keys";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

export type Params = {
	collectionKey: string;
	id: number;
	body: { environment: string };
};
const useUnpublishSingle = () =>
	serviceHelpers.useMutationWrapper({
		mutationFn: (params: Params) =>
			request<undefined>({
				url: `/api/v1/documents/${params.collectionKey}/${params.id}/unpublish`,
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
export default useUnpublishSingle;

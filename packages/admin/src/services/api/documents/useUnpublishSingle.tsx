import { queryKeys } from "@/services/query-keys";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

export type Params = {
	collectionKey: string;
	id: number;
	body: { target: string };
};
const useUnpublishSingle = () =>
	serviceHelpers.useMutationWrapper({
		mutationFn: (params: Params) =>
			request<undefined>({
				url: `/lucid/api/v1/documents/${params.collectionKey}/${params.id}/unpublish`,
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

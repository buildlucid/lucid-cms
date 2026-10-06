import { queryKeys } from "@/services/query-keys";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

export type Params = {
	collectionKey: string;
	id: number;
	body: { target: string; sourceVersionId?: number };
};
const usePublishSingle = () =>
	serviceHelpers.useMutationWrapper({
		mutationFn: (params: Params) =>
			request<undefined>({
				url: `/lucid/api/v1/documents/${params.collectionKey}/${params.id}/publish`,
				method: "POST",
				csrf: true,
				body: params.body,
			}),
		invalidates: [
			queryKeys.documents.all(),
			queryKeys.publishing.overview(),
			queryKeys.requests.all(),
		],
	});
export default usePublishSingle;

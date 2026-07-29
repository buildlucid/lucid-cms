import type { ResponseBody, UploadSessionResponse } from "@types";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	id?: number;
	body: {
		fileName: string;
		mimeType: string;
		size: number;
	};
}

const useCreateLogoUploadSession = () => {
	// ----------------------------------------
	// Mutation
	return serviceHelpers.useMutationWrapper<
		Params,
		ResponseBody<UploadSessionResponse>
	>({
		mutationFn: (params) =>
			request<ResponseBody<UploadSessionResponse>>({
				url:
					params.id === undefined
						? "/lucid/api/v1/integrations/oauth-clients/logo/upload-session"
						: `/lucid/api/v1/integrations/oauth-clients/${params.id}/logo/upload-session`,
				csrf: true,
				config: {
					method: "POST",
					body: params.body,
				},
			}),
	});
};

export default useCreateLogoUploadSession;

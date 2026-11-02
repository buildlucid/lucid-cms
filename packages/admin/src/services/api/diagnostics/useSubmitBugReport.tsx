import type { RichTextJSON } from "@lucidcms/rich-text";
import type { ResponseBody } from "@types";
import T from "@/translations";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

export interface SubmitBugReportParams {
	message: RichTextJSON;
	diagnostics: string | null;
	page: string | null;
	/** Images as base64, without a data URL prefix. */
	images: string[];
}

export const submitBugReportReq = (params: SubmitBugReportParams) => {
	return request<ResponseBody<null>>({
		url: "/api/v1/diagnostics/bug-reports",
		csrf: true,
		method: "POST",
		body: params,
	});
};

interface UseSubmitBugReportProps {
	onSuccess?: () => void;
	onError?: () => void;
}

const useSubmitBugReport = (props?: UseSubmitBugReportProps) => {
	return serviceHelpers.useMutationWrapper<
		SubmitBugReportParams,
		ResponseBody<null>
	>({
		mutationFn: submitBugReportReq,
		getSuccessToast: () => ({
			title: T()("bug.report.sent.title"),
			message: T()("bug.report.sent.message"),
		}),
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useSubmitBugReport;

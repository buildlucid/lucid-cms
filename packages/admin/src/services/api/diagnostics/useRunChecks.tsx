import type {
	DiagnosticCheckKey,
	DiagnosticCheckResult,
	ResponseBody,
} from "@types";
import request from "@/utils/request";
import serviceHelpers from "@/utils/service-helpers";

interface Params {
	checks: DiagnosticCheckKey[];
}

export const runChecksReq = (params: Params) => {
	return request<ResponseBody<DiagnosticCheckResult[]>>({
		url: "/api/v1/diagnostics/checks",
		csrf: true,
		method: "POST",
		body: params,
	});
};

interface UseRunChecksProps {
	onSuccess?: (_data: ResponseBody<DiagnosticCheckResult[]>) => void;
	onError?: () => void;
}

const useRunChecks = (props?: UseRunChecksProps) => {
	return serviceHelpers.useMutationWrapper<
		Params,
		ResponseBody<DiagnosticCheckResult[]>
	>({
		mutationFn: runChecksReq,
		onSuccess: props?.onSuccess,
		onError: props?.onError,
	});
};

export default useRunChecks;

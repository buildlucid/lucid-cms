import useGetDiagnostics from "./useGetDiagnostics";
import useGetPackageUpdates from "./useGetPackageUpdates";
import useRunChecks from "./useRunChecks";
import useSubmitBugReport from "./useSubmitBugReport";

const exportObject = {
	useGetDiagnostics,
	useGetPackageUpdates,
	useRunChecks,
	useSubmitBugReport,
};

export default exportObject;

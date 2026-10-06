import useAddDocuments from "./useAddDocuments";
import useApprove from "./useApprove";
import useClose from "./useClose";
import useCreateComment from "./useCreateComment";
import useCreateSingle from "./useCreateSingle";
import useDeleteComment from "./useDeleteComment";
import useGetExecution from "./useGetExecution";
import useGetMentionableUsers from "./useGetMentionableUsers";
import useGetMultiple from "./useGetMultiple";
import useGetOverview from "./useGetOverview";
import useGetReviewers from "./useGetReviewers";
import useGetSingle from "./useGetSingle";
import usePublish from "./usePublish";
import useRemoveDocument from "./useRemoveDocument";
import useReopen from "./useReopen";
import useReviewTarget from "./useReviewTarget";
import useUnapprove from "./useUnapprove";
import useUpdateComment from "./useUpdateComment";
import useUpdateCommentResolution from "./useUpdateCommentResolution";
import useUpdateSingle from "./useUpdateSingle";
import useUpdateTargets from "./useUpdateTargets";

const exportObject = {
	useAddDocuments,
	useRemoveDocument,
	useReviewTarget,
	useGetMultiple,
	useGetOverview,
	useGetSingle,
	useGetExecution,
	useGetReviewers,
	useGetMentionableUsers,
	useCreateSingle,
	useUpdateSingle,
	useUpdateTargets,
	useApprove,
	useUnapprove,
	usePublish,
	useClose,
	useReopen,
	useCreateComment,
	useUpdateComment,
	useUpdateCommentResolution,
	useDeleteComment,
};

export default exportObject;

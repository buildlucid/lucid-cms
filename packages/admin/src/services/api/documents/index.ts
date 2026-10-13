import { deleteEditorReq, updateEditorReq } from "./editors";
import useAlign from "./useAlign";
import useCheckSingleVersion from "./useCheckSingleVersion";
import useCreatePreview from "./useCreatePreview";
import useCreateSingle from "./useCreateSingle";
import useCreateSingleVersion from "./useCreateSingleVersion";
import useDeleteMultiple from "./useDeleteMultiple";
import useDeleteMultiplePermanently from "./useDeleteMultiplePermanently";
import useDeleteSingle from "./useDeleteSingle";
import useDeleteSinglePermanently from "./useDeleteSinglePermanently";
import useDuplicateSingle from "./useDuplicateSingle";
import useGetMultiple from "./useGetMultiple";
import useGetMultipleRevisions from "./useGetMultipleRevisions";
import useGetSingle from "./useGetSingle";
import useGetWorkflowAssignees from "./useGetWorkflowAssignees";
import usePublishSingle from "./usePublishSingle";
import useRequestSingle from "./useRequestSingle";
import useRestore from "./useRestore";
import useRestoreRevision from "./useRestoreRevision";
import useUnpublishSingle from "./useUnpublishSingle";
import useUpdateOrder from "./useUpdateOrder";
import useUpdateSingleVersion from "./useUpdateSingleVersion";
import useUpdateWorkflow from "./useUpdateWorkflow";

const exportObject = {
	updateEditorReq,
	deleteEditorReq,
	useAlign,
	useGetMultiple,
	useCreatePreview,
	useDeleteSingle,
	useDeleteMultiple,
	useDeleteMultiplePermanently,
	useCheckSingleVersion,
	useCreateSingleVersion,
	useCreateSingle,
	useRequestSingle,
	usePublishSingle,
	useUnpublishSingle,
	useGetSingle,
	useGetMultipleRevisions,
	useRestoreRevision,
	useUpdateOrder,
	useUpdateSingleVersion,
	useUpdateWorkflow,
	useRestore,
	useDeleteSinglePermanently,
	useDuplicateSingle,
	useGetWorkflowAssignees,
};

export default exportObject;

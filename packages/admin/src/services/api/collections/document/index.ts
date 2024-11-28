import useGetMultiple from "./useGetMultiple";
import useDeleteSingle from "./useDeleteSingle";
import useDeleteMultiple from "./useDeleteMultiple";
import useUpdateSingle from "./useUpdateSingle";
import useGetSingle from "./useGetSingle";
import useCreateSingle from "./useCreateSingle";
import usePromoteSingle from "./usePromoteSingle";
import useGetSingleVersion from "./useGetSingleVersion";
import useGetMultipleRevisions from "./useGetMultipleRevisions";
import useRestoreRevision from "./useRestoreRevision";

const exportObject: {
	useGetMultiple: typeof useGetMultiple;
	useDeleteSingle: typeof useDeleteSingle;
	useDeleteMultiple: typeof useDeleteMultiple;
	useUpdateSingle: typeof useUpdateSingle;
	useCreateSingle: typeof useCreateSingle;
	useGetSingle: typeof useGetSingle;
	usePromoteSingle: typeof usePromoteSingle;
	useGetSingleVersion: typeof useGetSingleVersion;
	useGetMultipleRevisions: typeof useGetMultipleRevisions;
	useRestoreRevision: typeof useRestoreRevision;
} = {
	useGetMultiple,
	useDeleteSingle,
	useDeleteMultiple,
	useUpdateSingle,
	useCreateSingle,
	useGetSingle,
	usePromoteSingle,
	useGetSingleVersion,
	useGetMultipleRevisions,
	useRestoreRevision,
};

export default exportObject;

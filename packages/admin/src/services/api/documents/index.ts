import useGetMultiple from "./useGetMultiple";
import useDeleteSingle from "./useDeleteSingle";
import useDeleteMultiple from "./useDeleteMultiple";
import useCreateSingleVersion from "./useCreateSingleVersion";
import useGetSingle from "./useGetSingle";
import useCreateSingle from "./useCreateSingle";
import usePromoteSingle from "./usePromoteSingle";
import useGetSingleVersion from "./useGetSingleVersion";
import useGetMultipleRevisions from "./useGetMultipleRevisions";
import useRestoreRevision from "./useRestoreRevision";
import useUpdateSingleVersion from "./useUpdateSingleVersion";
import useRestore from "./useRestore";

const exportObject: {
	useGetMultiple: typeof useGetMultiple;
	useDeleteSingle: typeof useDeleteSingle;
	useDeleteMultiple: typeof useDeleteMultiple;
	useCreateSingleVersion: typeof useCreateSingleVersion;
	useCreateSingle: typeof useCreateSingle;
	useGetSingle: typeof useGetSingle;
	usePromoteSingle: typeof usePromoteSingle;
	useGetSingleVersion: typeof useGetSingleVersion;
	useGetMultipleRevisions: typeof useGetMultipleRevisions;
	useRestoreRevision: typeof useRestoreRevision;
	useUpdateSingleVersion: typeof useUpdateSingleVersion;
	useRestore: typeof useRestore;
} = {
	useGetMultiple,
	useDeleteSingle,
	useDeleteMultiple,
	useCreateSingleVersion,
	useCreateSingle,
	useGetSingle,
	usePromoteSingle,
	useGetSingleVersion,
	useGetMultipleRevisions,
	useRestoreRevision,
	useUpdateSingleVersion,
	useRestore,
};

export default exportObject;

import useCreateSingle from "./useCreateSingle";
import useCreateSingleVersion from "./useCreateSingleVersion";
import useDeleteMultiple from "./useDeleteMultiple";
import useDeleteMultiplePermanently from "./useDeleteMultiplePermanently";
import useDeleteSingle from "./useDeleteSingle";
import useDeleteSinglePermanently from "./useDeleteSinglePermanently";
import useGetMultiple from "./useGetMultiple";
import useGetMultipleRevisions from "./useGetMultipleRevisions";
import useGetSingle from "./useGetSingle";
import useGetSingleVersion from "./useGetSingleVersion";
import usePromoteSingle from "./usePromoteSingle";
import useRestore from "./useRestore";
import useRestoreRevision from "./useRestoreRevision";
import useUpdateSingleVersion from "./useUpdateSingleVersion";

const exportObject = {
	useGetMultiple,
	useDeleteSingle,
	useDeleteMultiple,
	useDeleteMultiplePermanently,
	useCreateSingleVersion,
	useCreateSingle,
	useGetSingle,
	usePromoteSingle,
	useGetSingleVersion,
	useGetMultipleRevisions,
	useRestoreRevision,
	useUpdateSingleVersion,
	useRestore,
	useDeleteSinglePermanently,
};

export default exportObject;

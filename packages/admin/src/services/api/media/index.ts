import useCreateSingle from "./useCreateSingle";
import useDeleteAllProcessedImages from "./useDeleteAllProcessedImages";
import useDeleteBatch from "./useDeleteBatch";
import useDeleteMultiplePermanently from "./useDeleteMultiplePermanently";
import useDeleteProcessedImages from "./useDeleteProcessedImages";
import useDeleteSingle from "./useDeleteSingle";
import useDeleteSinglePermanently from "./useDeleteSinglePermanently";
import useGetMultiple from "./useGetMultiple";
import useGetPresignedUrl from "./useGetPresignedUrl";
import useGetSingle from "./useGetSingle";
import useMoveFolder from "./useMoveFolder";
import useRestore from "./useRestore";
import useUpdateSingle from "./useUpdateSingle";

const exportObject = {
	useGetMultiple,
	useGetSingle,
	useUpdateSingle,
	useDeleteSingle,
	useDeleteAllProcessedImages,
	useDeleteProcessedImages,
	useCreateSingle,
	useGetPresignedUrl,
	useDeleteSinglePermanently,
	useDeleteBatch,
	useDeleteMultiplePermanently,
	useMoveFolder,
	useRestore,
};

export default exportObject;

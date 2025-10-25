import useGetMultiple from "./useGetMultiple";
import useGetSingle from "./useGetSingle";
import useUpdateSingle from "./useUpdateSingle";
import useDeleteSingle from "./useDeleteSingle";
import useDeleteAllProcessedImages from "./useDeleteAllProcessedImages";
import useDeleteProcessedImages from "./useDeleteProcessedImages";
import useCreateSingle from "./useCreateSingle";
import useGetPresignedUrl from "./useGetPresignedUrl";
import useDeleteSinglePermanently from "./useDeleteSinglePermanently";
import useDeleteBatch from "./useDeleteBatch";
import useMoveFolder from "./useMoveFolder";
import useRestore from "./useRestore";

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
	useMoveFolder,
	useRestore,
};

export default exportObject;

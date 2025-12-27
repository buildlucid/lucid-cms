import useCreateSingle from "./useCreateSingle";
import useDeleteAllForMedia from "./useDeleteAllForMedia";
import useDeleteAllSystem from "./useDeleteAllSystem";
import useDeleteSingle from "./useDeleteSingle";
import useGetMultiple from "./useGetMultiple";
import useGetSingle from "./useGetSingle";
import useUpdateSingle from "./useUpdateSingle";

const exportObject = {
	useGetMultiple,
	useGetSingle,
	useCreateSingle,
	useUpdateSingle,
	useDeleteSingle,
	useDeleteAllForMedia,
	useDeleteAllSystem,
};

export default exportObject;

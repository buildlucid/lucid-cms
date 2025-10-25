import useGetMultiple from "./useGetMultiple";
import useGetSingle from "./useGetSingle";
import useCreateSingle from "./useCreateSingle";
import useUpdateSingle from "./useUpdateSingle";
import useDeleteSingle from "./useDeleteSingle";
import useDeleteAllForMedia from "./useDeleteAllForMedia";
import useDeleteAllSystem from "./useDeleteAllSystem";

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

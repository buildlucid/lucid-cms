import useGetMultiple from "./useGetMultiple";
import useGetSingle from "./useGetSingle";
import useCreateSingle from "./useCreateSingle";
import useUpdateSingle from "./useUpdateSingle";
import useDeleteSingle from "./useDeleteSingle";
import useDeleteAllForMedia from "./useDeleteAllForMedia";
import useDeleteAllSystem from "./useDeleteAllSystem";

const exportObject: {
	useGetMultiple: typeof useGetMultiple;
	useGetSingle: typeof useGetSingle;
	useCreateSingle: typeof useCreateSingle;
	useUpdateSingle: typeof useUpdateSingle;
	useDeleteSingle: typeof useDeleteSingle;
	useDeleteAllForMedia: typeof useDeleteAllForMedia;
	useDeleteAllSystem: typeof useDeleteAllSystem;
} = {
	useGetMultiple,
	useGetSingle,
	useCreateSingle,
	useUpdateSingle,
	useDeleteSingle,
	useDeleteAllForMedia,
	useDeleteAllSystem,
};

export default exportObject;

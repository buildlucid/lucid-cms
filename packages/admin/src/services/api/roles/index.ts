import useCreateSingle from "./useCreateSingle";
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
};

export default exportObject;

import useGetMultiple from "./useGetMultiple";
import useGetSingle from "./useGetSingle";
import useCreateSingle from "./useCreateSingle";
import useUpdateSingle from "./useUpdateSingle";
import useDeleteSingle from "./useDeleteSingle";

const exportObject: {
	useGetMultiple: typeof useGetMultiple;
	useGetSingle: typeof useGetSingle;
	useCreateSingle: typeof useCreateSingle;
	useUpdateSingle: typeof useUpdateSingle;
	useDeleteSingle: typeof useDeleteSingle;
} = {
	useGetMultiple,
	useGetSingle,
	useCreateSingle,
	useUpdateSingle,
	useDeleteSingle,
};

export default exportObject;

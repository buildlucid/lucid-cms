import useGetMultiple from "./useGetMultiple";
import useCreateSingle from "./useCreateSingle";
import useUpdateSingle from "./useUpdateSingle";

const exportObject: {
	useGetMultiple: typeof useGetMultiple;
	useCreateSingle: typeof useCreateSingle;
	useUpdateSingle: typeof useUpdateSingle;
} = {
	useGetMultiple,
	useCreateSingle,
	useUpdateSingle,
};

export default exportObject;

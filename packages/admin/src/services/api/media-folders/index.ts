import useGetMultiple from "./useGetMultiple";
import useCreateSingle from "./useCreateSingle";

const exportObject: {
	useGetMultiple: typeof useGetMultiple;
	useCreateSingle: typeof useCreateSingle;
} = {
	useGetMultiple,
	useCreateSingle,
};

export default exportObject;

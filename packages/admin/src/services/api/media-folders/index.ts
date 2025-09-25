import useGetMultiple from "./useGetMultiple";
import useGetHierarchy from "./useGetHierarchy";
import useCreateSingle from "./useCreateSingle";
import useUpdateSingle from "./useUpdateSingle";

const exportObject: {
	useGetMultiple: typeof useGetMultiple;
	useGetHierarchy: typeof useGetHierarchy;
	useCreateSingle: typeof useCreateSingle;
	useUpdateSingle: typeof useUpdateSingle;
} = {
	useGetMultiple,
	useGetHierarchy,
	useCreateSingle,
	useUpdateSingle,
};

export default exportObject;

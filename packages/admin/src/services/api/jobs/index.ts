import useGetMultiple from "./useGetMultiple";
import useGetSingle from "./useGetSingle";

const exportObject: {
	useGetMultiple: typeof useGetMultiple;
	useGetSingle: typeof useGetSingle;
} = {
	useGetMultiple,
	useGetSingle,
};

export default exportObject;

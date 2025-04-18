import useGetAll from "./useGetAll";
import useGetSingle from "./useGetSingle";

const exportObject: {
	useGetAll: typeof useGetAll;
	useGetSingle: typeof useGetSingle;
} = {
	useGetAll,
	useGetSingle,
};

export default exportObject;

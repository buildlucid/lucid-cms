import document from "./document";
import useGetAll from "./useGetAll";
import useGetSingle from "./useGetSingle";

const exportObject: {
	document: typeof document;
	useGetAll: typeof useGetAll;
	useGetSingle: typeof useGetSingle;
} = {
	document,
	useGetAll,
	useGetSingle,
};

export default exportObject;

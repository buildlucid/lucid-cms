import useGetSettings from "./useGetSettings";
import useClearKV from "./useClearKV";

const exportObject: {
	useGetSettings: typeof useGetSettings;
	useClearKV: typeof useClearKV;
} = {
	useGetSettings,
	useClearKV,
};

export default exportObject;

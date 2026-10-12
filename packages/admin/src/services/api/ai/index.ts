import useGetCredits from "./useGetCredits";
import useGetMediaModels from "./useGetMediaModels";
import useGetUsageChart from "./useGetUsageChart";
import useGetUsageSession from "./useGetUsageSession";
import useGetUsageSessionRecords from "./useGetUsageSessionRecords";
import useGetUsageSessions from "./useGetUsageSessions";
import useMediaAltGenerate from "./useMediaAltGenerate";
import useMediaAudioGenerate from "./useMediaAudioGenerate";
import useMediaImageGenerate from "./useMediaImageGenerate";

const exportObject = {
	useGetCredits,
	useGetMediaModels,
	useGetUsageChart,
	useGetUsageSession,
	useGetUsageSessionRecords,
	useGetUsageSessions,
	useMediaAltGenerate,
	useMediaAudioGenerate,
	useMediaImageGenerate,
};

export default exportObject;

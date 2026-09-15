/**
 * Determines if the user device is a mac or not
 */
const isMac = () => {
	return /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
};

export default isMac;

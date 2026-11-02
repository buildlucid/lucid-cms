/** Saves a file the browser built, eg. an export or recovery codes, through a temporary link. */
const downloadFile = (file: Blob, fileName: string) => {
	const url = URL.createObjectURL(file);
	const link = document.createElement("a");
	link.href = url;
	link.download = fileName;
	link.click();
	//* some browsers cancel the download if the URL goes before it starts
	window.setTimeout(() => URL.revokeObjectURL(url));
};

export default downloadFile;

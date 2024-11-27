//* Limited 1 level deep and file/string only object to form data conversion
const objectToFormData = <T = Record<string, string | File>>(
	obj: T,
	stringify?: Record<string, boolean>,
): FormData => {
	const formData = new FormData();

	for (const key in obj) {
		if (Object.prototype.hasOwnProperty.call(obj, key)) {
			const value = obj[key];
			if (value instanceof File) {
				formData.append(key, value);
				continue;
			}
			if (stringify?.[key]) {
				formData.append(key, JSON.stringify(value));
				continue;
			}
			if (typeof value === "string") {
				formData.append(key, value);
			}
		}
	}

	return formData;
};

export default objectToFormData;

import userStore from "@/store/userStore/userStore";
import T from "@/translations";

/**
 * Greets the signed-in user for the time of day on their own device, such as
 * "Good afternoon, Will". Falls back to their username, then to no name.
 */
export const getGreeting = () => {
	const user = userStore.get.user;
	const name = user?.firstName || user?.username;
	const values = { name: name ? `, ${name}` : "" };
	const hour = new Date().getHours();

	if (hour < 12) return T()("home.greeting.morning", values);
	if (hour < 18) return T()("home.greeting.afternoon", values);
	return T()("home.greeting.evening", values);
};

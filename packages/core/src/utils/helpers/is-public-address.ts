import ipaddr from "ipaddr.js";

/** Checks for public unicast addresses, normalizing IPv4-mapped IPv6 first. */
const isPublicAddress = (address: string) =>
	ipaddr.isValid(address) && ipaddr.process(address).range() === "unicast";

export default isPublicAddress;

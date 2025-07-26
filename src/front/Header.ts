import van from "vanjs-core";
import { authUser, jumpPath, NavLink } from "./utils";

const { nav, a } = van.tags;

const Header = () => {
	return nav(
		() => (authUser.val ? "" : NavLink({ path: "/" }, "Home")),
		() => (authUser.val ? "" : NavLink({ path: "/login" }, "Login")),
		() => (authUser.val ? NavLink({ path: "/dashboard" }, "Dashboard") : ""),
		() => (authUser.val ? NavLink({ path: "/add" }, "Add Receipt") : ""),
		() => (authUser.val ? NavLink({ path: "/settings" }, "Settings") : ""),
		() =>
			authUser.val
				? a(
						{
							href: "#",
							onclick: async (e: Event) => {
								e.preventDefault();
								try {
									await fetch("/api/logout", { method: "POST" });
									authUser.val = null;
									jumpPath("/");
								} catch (error) {
									console.error("Logout failed:", error);
								}
							},
						},
						"Logout",
					)
				: "",
	);
};

export default Header;

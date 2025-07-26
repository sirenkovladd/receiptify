import van, { type ChildDom } from "vanjs-core";
import type { ReceiptUpload, Tag } from "../back/db";

const { a } = van.tags;

const getStoredUser = () => {
	try {
		const user = localStorage.getItem("authUser");
		return user ? JSON.parse(user) : null;
	} catch (e) {
		return null;
	}
};

export const authUser = van.state<{ name: string } | null>(getStoredUser());

export const page = van.state(location.pathname);
export const routerParam = van.state<object>({});

export const jumpPath = (path: string) => {
	window.history.pushState({}, "", path);
	setTimeout(() => {
		page.val = path;
	});
};

export const selectedReceipt = van.state<ReceiptUpload | null>(null);

export const NavLink = (
	opt: {
		path: string;
		onclick?: () => void;
		class?: string;
	},
	...rest: readonly ChildDom[]
) =>
	a(
		{
			href: opt.path,
			onclick: (e: Event) => {
				e.preventDefault();
				opt.onclick?.();
				jumpPath(opt.path);
			},
			class: () => (page.val === opt.path ? `${opt.class || ""} active` : opt.class || ""),
		},
		...rest,
	);

export const storeNamesList = van.state<string[]>([]);

export let fetchStoreNames = async () => {
	const prev = fetchStoreNames;
	fetchStoreNames = async () => {};
	try {
		const response = await fetch("/api/stores");
		if (response.ok) {
			storeNamesList.val = await response.json();
		}
	} catch (error) {
		console.error("Failed to fetch store names:", error);
		fetchStoreNames = prev;
	}
};

export const tagsList = van.state<Tag[]>([{ name: 'qwe'}, { name: 'asd' }, { name: 'zxc' }]);

export let fetchTags = async () => {
	const prev = fetchTags;
	fetchTags = async () => {};
	try {
		const response = await fetch("/api/tags");
		if (response.ok) {
			tagsList.val = await response.json();
		}
	} catch (error) {
		console.error("Failed to fetch tags:", error);
		fetchTags = prev;
	}
};

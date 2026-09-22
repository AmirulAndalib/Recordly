import { expect, test } from "@playwright/test";
import { installDesktopBridge } from "./bridge";

test("home dashboard searches, sorts, opens projects and returns to the editor", async ({
	page,
}) => {
	await installDesktopBridge(page);
	await page.addInitScript(() => {
		const entries = [
			{
				path: "/projects/launch.recordly",
				name: "Launch video",
				updatedAt: 1758000000000,
				thumbnailPath: null,
				isCurrent: true,
				isInProjectsDirectory: true,
			},
			{
				path: "/projects/demo.recordly",
				name: "App walkthrough",
				updatedAt: 1759000000000,
				thumbnailPath: `${location.origin}/tests/ui/fixtures/recording-thumbnail.jpg`,
				isCurrent: false,
				isInProjectsDirectory: true,
			},
			{
				path: "/projects/tutorial.recordly",
				name: "Getting started",
				updatedAt: 1757000000000,
				thumbnailPath: null,
				isCurrent: false,
				isInProjectsDirectory: true,
			},
		];
		window.electronAPI.listProjectFiles = async () => ({
			success: true,
			projects: [],
			entries,
		});
		window.electronAPI.openProjectFileAtPath = async (path) => {
			document.documentElement.dataset.openedProject = path;
			return { success: false, canceled: true };
		};
	});
	await page.goto("/?windowType=editor");
	await page.getByRole("button", { name: "Home", exact: true }).click();
	const home = page.getByRole("dialog", { name: "Projects dashboard", exact: true });
	await expect(home).toBeVisible();
	const cards = home.getByRole("list", { name: "Your projects" }).locator("li > button");
	await expect(cards).toHaveCount(3);
	await expect(cards.first()).toHaveAccessibleName("App walkthrough");
	await home.getByRole("button", { name: "Sort projects" }).click();
	await page.getByRole("menuitem", { name: "Name", exact: true }).click();
	await expect(cards.nth(1)).toHaveAccessibleName("Getting started");
	await home.getByRole("textbox", { name: "Search projects" }).fill("launch");
	await expect(cards).toHaveCount(1);
	await home.getByRole("textbox", { name: "Search projects" }).fill("missing");
	await expect(home.getByText("No matching projects")).toBeVisible();
	await home.getByRole("button", { name: "Clear search" }).click();
	await home.getByRole("button", { name: "App walkthrough", exact: true }).click();
	await expect(page.getByRole("dialog", { name: "Project details" })).toHaveCount(0);
	await expect(page.locator("html")).toHaveAttribute(
		"data-opened-project",
		"/projects/demo.recordly",
	);
	await expect(home).toBeVisible();
	await home.getByRole("button", { name: "New folder", exact: true }).click();
	await expect(page.getByRole("dialog", { name: "New folder", exact: true })).toHaveCount(0);
	await home.getByRole("button", { name: "Untitled folder", exact: true }).dblclick();
	await home.getByRole("textbox", { name: "Folder name" }).fill("Tutorials");
	await page.keyboard.press("Enter");
	await home.getByRole("button", { name: "Change color for Tutorials", exact: true }).click();
	await page.getByRole("textbox", { name: "Hex color", exact: true }).fill("#123abc");
	await page.keyboard.press("Tab");
	await page.getByRole("button", { name: "Save custom color", exact: true }).click();
	await expect(
		page.getByRole("button", { name: "Remove custom color", exact: true }),
	).toBeVisible();
	await page.keyboard.press("Escape");
	await home.getByRole("button", { name: "Home", exact: true }).click();
	await expect(home.locator('[aria-label="Local profile"]')).toHaveCount(3);

	await home.getByRole("button", { name: "Options for App walkthrough", exact: true }).click();
	await expect(page.getByRole("menuitem", { name: "No folder", exact: true })).toHaveCount(0);
	await page.keyboard.press("Escape");
	await home.getByRole("button", { name: "Add folder to App walkthrough", exact: true }).click();
	await page.getByRole("menuitem", { name: "Tutorials", exact: true }).click();
	await expect(
		home.getByRole("button", { name: "Remove App walkthrough from Tutorials", exact: true }),
	).toContainText("Tutorials");
	await home.getByRole("button", { name: "Tutorials", exact: true }).click();
	await expect(cards).toHaveCount(1);
	await expect(cards.first()).toHaveAccessibleName("App walkthrough");
	await home.getByRole("button", { name: "Home", exact: true }).click();
	await home.getByRole("button", { name: "Last 7 days", exact: true }).click();
	await expect(cards).toHaveCount(0);
	await home.getByRole("button", { name: "All", exact: true }).click();
	await expect(cards).toHaveCount(3);
	await home.getByRole("button", { name: "Settings", exact: true }).click();
	await expect(home.getByRole("region", { name: "Dashboard settings" })).toBeVisible();
	await home.getByRole("button", { name: "Home", exact: true }).click();
	await home.getByRole("button", { name: "New", exact: true }).click();
	await expect(page.locator("html")).toHaveAttribute("data-hud-opened", "true");
	await home.getByRole("button", { name: "Select projects to delete" }).click();
	await cards.first().click();
	await expect(cards.first()).toHaveAttribute("aria-pressed", "true");
	await home.getByRole("button", { name: "Delete", exact: true }).click();
	await expect(page.getByRole("dialog", { name: "Delete 1 project?" })).toBeVisible();
	await page
		.getByRole("dialog", { name: "Delete 1 project?" })
		.getByRole("button", { name: "Cancel", exact: true })
		.click();
	await home.getByRole("button", { name: "Cancel", exact: true }).click();
	await page.screenshot({ path: "test-results/project-dashboard.png", animations: "disabled" });
	await page.evaluate(() => document.documentElement.classList.add("dark"));
	await page.screenshot({
		path: "test-results/project-dashboard-dark.png",
		animations: "disabled",
	});
	await page.evaluate(() => document.documentElement.classList.remove("dark"));
	await page.setViewportSize({ width: 800, height: 800 });
	await expect(home.getByRole("button", { name: "Import", exact: true })).toBeInViewport();
	await page.screenshot({
		path: "test-results/project-dashboard-compact.png",
		animations: "disabled",
	});
	await home.getByRole("button", { name: "Launch video", exact: true }).click();
	await expect(home).not.toBeVisible();
	await expect(page.getByRole("button", { name: "Rename project" })).toBeVisible();
});

test("home dashboard explains an empty library", async ({ page }) => {
	await installDesktopBridge(page);
	await page.goto("/?windowType=editor");
	await page.getByRole("button", { name: "Home", exact: true }).click();
	await expect(page.getByText("No projects yet")).toBeVisible();
	await page.getByRole("button", { name: "Back to editor" }).click();
	await expect(page.getByRole("button", { name: "Rename project" })).toBeVisible();
});

test("autosave creates one untitled project, stays idle without edits, and refreshes its preview on exit without a saved toast", async ({
	page,
}) => {
	await installDesktopBridge(page);
	await page.goto("/?windowType=editor");
	await expect(page.locator("html")).toHaveAttribute("data-project-creates", "1");
	await expect(page.getByRole("button", { name: "Rename project" })).toContainText(
		"Untitled Project",
	);
	// Observe more than two debounce periods: idle must not perform periodic saves.
	const before = await page.locator("html").getAttribute("data-project-saves");
	await page.waitForTimeout(1800);
	await expect(page.locator("html")).toHaveAttribute("data-project-creates", "1");
	expect(await page.locator("html").getAttribute("data-project-saves")).toBe(before);
	await page.getByRole("button", { name: "Home", exact: true }).click();
	await expect(page.getByRole("dialog", { name: "Projects dashboard" })).toBeVisible();
	await expect(page.locator("html")).toHaveAttribute(
		"data-saved-thumbnail",
		/^data:image\/png;base64,/,
	);
	await expect(page.getByText(/Project saved/)).toHaveCount(0);
});

test("deletion refreshes the grid and keeps unselected projects", async ({ page }) => {
	await installDesktopBridge(page);
	await page.addInitScript(() => {
		let entries = ["Keep", "Delete"].map((name) => ({
			path: `/projects/${name}.recordly`,
			name,
			updatedAt: Date.now(),
			thumbnailPath: null,
			isCurrent: false,
			isInProjectsDirectory: true,
		}));
		window.electronAPI.listProjectFiles = async () => ({ success: true, entries });
		window.electronAPI.trashProjectFiles = async (paths) => {
			entries = entries.filter((e) => !paths.includes(e.path));
			return { success: true, deleted: paths, errors: [] };
		};
	});
	await page.goto("/?windowType=editor");
	await page.getByRole("button", { name: "Home", exact: true }).click();
	const home = page.getByRole("dialog", { name: "Projects dashboard" });
	await home.getByRole("button", { name: "Select projects to delete" }).click();
	await home.getByRole("list").getByRole("button", { name: "Delete", exact: true }).click();
	await home
		.getByRole("button", { name: "Delete", exact: true })
		.filter({ hasNot: page.locator("img") })
		.first()
		.click();
	await page
		.getByRole("dialog", { name: "Delete 1 project?" })
		.getByRole("button", { name: "Move to Trash" })
		.click();
	await expect(
		home.getByRole("list").getByRole("button", { name: "Delete", exact: true }),
	).toHaveCount(0);
	await expect(home.getByRole("button", { name: "Keep", exact: true })).toBeVisible();
});

test("cards rename inline, preserve folder chips and use existing share links", async ({
	page,
}) => {
	await installDesktopBridge(page);
	await page.addInitScript(() => {
		let entry = {
			path: "/projects/demo.recordly",
			name: "Demo",
			updatedAt: Date.now(),
			thumbnailPath: null,
			isCurrent: false,
			isInProjectsDirectory: true,
		};
		localStorage.setItem(
			"recordly.project-folders.v1",
			JSON.stringify([{ id: "folder", name: "Work", color: "#123abc", paths: [entry.path] }]),
		);
		localStorage.setItem(
			"recordly.project-share-links.v1",
			JSON.stringify({ [entry.path]: "https://example.com/shared/demo" }),
		);
		window.electronAPI.listProjectFiles = async () => ({ success: true, entries: [entry] });
		window.electronAPI.renameLibraryProject = async (_path, name) => {
			entry = { ...entry, path: `/projects/${name}.recordly`, name };
			return { success: true, path: entry.path };
		};
		window.electronAPI.openExternalUrl = async (url) => {
			document.documentElement.dataset.openedUrl = url;
			return { success: true };
		};
	});
	await page.goto("/?windowType=editor");
	await page.getByRole("button", { name: "Home", exact: true }).click();
	const home = page.getByRole("dialog", { name: "Projects dashboard" });
	await expect(home.getByRole("button", { name: "Remove Demo from Work" })).toContainText("Work");
	await home.getByRole("button", { name: "Options for Demo" }).click();
	await page.getByRole("menuitem", { name: "View in web", exact: true }).click();
	await expect(page.locator("html")).toHaveAttribute(
		"data-opened-url",
		"https://example.com/shared/demo",
	);
	await home.getByRole("button", { name: "Options for Demo" }).click();
	await page.getByRole("menuitem", { name: "Rename", exact: true }).click();
	await home.getByRole("textbox", { name: "Project name" }).fill("Renamed");
	await page.keyboard.press("Enter");
	await expect(home.getByRole("button", { name: "Renamed", exact: true })).toBeVisible();
	await expect(home.getByRole("button", { name: "Remove Renamed from Work" })).toContainText(
		"Work",
	);
	await home.getByRole("button", { name: "Options for Renamed" }).click();
	await expect(page.getByRole("menuitem", { name: "View in web", exact: true })).toBeVisible();
});

test("dashboard supports creation sort, independent folders, shared settings and precise captions", async ({
	page,
}) => {
	await installDesktopBridge(page);
	await page.addInitScript(() => {
		localStorage.setItem(
			"recordly.project-folders.v1",
			JSON.stringify([
				{ id: "one", name: "Work", color: "#123abc", paths: ["/old.recordly"] },
				{ id: "two", name: "Personal", color: "#123abc", paths: [] },
			]),
		);
		window.electronAPI.listProjectFiles = async () => ({
			success: true,
			entries: [
				{
					path: "/old.recordly",
					name: "Old",
					updatedAt: 300,
					createdAt: 100,
					thumbnailPath: null,
					isCurrent: false,
					isInProjectsDirectory: true,
				},
				{
					path: "/new.recordly",
					name: "Newer",
					updatedAt: 200,
					createdAt: 200,
					thumbnailPath: null,
					isCurrent: false,
					isInProjectsDirectory: true,
				},
			],
		});
	});
	await page.goto("/?windowType=editor");
	await page.getByRole("radio", { name: "Videos", exact: true }).click();
	await expect(page.getByRole("complementary", { name: "Videos" })).toBeVisible();
	await page.getByRole("button", { name: "Home", exact: true }).click();
	const home = page.getByRole("dialog", { name: "Projects dashboard" });
	await expect(home.getByLabel("Announcements", { exact: true })).toHaveCount(0);
	await home.getByRole("button", { name: "Sort projects" }).click();
	await page.getByRole("menuitem", { name: "Last created", exact: true }).click();
	await expect(
		home.getByRole("list", { name: "Your projects" }).locator("li > button").first(),
	).toHaveAccessibleName("Newer");
	await home.getByRole("button", { name: "Add folder to Old" }).click();
	await page.getByRole("menuitem", { name: "Personal", exact: true }).click();
	await expect(home.getByRole("button", { name: "Remove Old from Work" })).toBeVisible();
	await expect(home.getByRole("button", { name: "Remove Old from Personal" })).toBeVisible();
	const membership = await page.evaluate(() =>
		JSON.parse(localStorage.getItem("recordly.project-folders.v1") || "[]"),
	);
	expect(
		membership.every((folder: { paths: string[] }) => folder.paths.includes("/old.recordly")),
	).toBe(true);
	const heights = await home
		.getByRole("list", { name: "Your projects" })
		.locator("li")
		.evaluateAll((cards) =>
			cards.map((card) => [
				card.querySelector('[aria-label="Local profile"]')!.getBoundingClientRect().height,
				card.querySelector("[data-project-caption]")!.getBoundingClientRect().height,
			]),
		);
	for (const [avatar, caption] of heights) expect(avatar).toBe(caption);
	const avatar = home.locator('[aria-label="Local profile"]').first();
	const circle = await avatar.evaluate((element) => {
		const style = getComputedStyle(element);
		const rect = element.getBoundingClientRect();
		return { width: rect.width, height: rect.height, radius: parseFloat(style.borderRadius) };
	});
	expect(circle.width).toBe(circle.height);
	expect(circle.radius).toBeGreaterThanOrEqual(circle.width / 2);
	await expect(avatar).toHaveText("LP");
	await home.getByRole("button", { name: "Settings", exact: true }).click();
	await expect(home.getByRole("textbox", { name: "Search projects" })).toHaveCount(0);
	await expect(home.getByRole("button", { name: "Sort projects" })).toHaveCount(0);
	await expect(home.getByRole("row", { name: "Dark", exact: true })).toBeVisible();
	await expect(home.getByRole("switch", { name: "Experimental updates" })).toBeVisible();
	await expect(home.getByRole("switch", { name: "Connect Zooms" })).toBeVisible();
	await page.screenshot({ path: "test-results/dashboard-settings.png" });
});

test("Solar navigation selection, circular initials, and Raw sources are consistent", async ({
	page,
}) => {
	await installDesktopBridge(page);
	await page.addInitScript(() => {
		window.electronAPI.listRecordings = async (includeSources) => ({
			success: true,
			value: (includeSources
				? ["screen.mp4", "screen.webcam.mp4", "screen.mic.wav"]
				: ["screen.mp4"]
			).map((name) => ({
				path: `/recordings/${name}`,
				name,
				createdAt: Date.now(),
				bytes: 1048576,
				url: `${location.origin}/tests/ui/fixtures/preview.mp4`,
			})),
		});
		window.electronAPI.revealInFolder = async (path) => {
			document.documentElement.dataset.revealed = path;
			return { success: true };
		};
		window.electronAPI.getRecordingThumbnail = async () => ({
			success: false,
			error: "No thumbnail",
		});
	});
	await page.goto("/?windowType=editor");
	const scene = page.getByRole("radio", { name: "Scene", exact: true });
	const videos = page.getByRole("radio", { name: "Videos", exact: true });
	await expect(scene).toBeChecked();
	await expect(scene.locator("svg")).toHaveAttribute("data-icon-style", "bold");
	await videos.click();
	await expect(videos).toBeChecked();
	await expect(videos.locator("svg")).toHaveAttribute("data-icon-style", "bold");
	await expect(scene.locator("svg")).toHaveAttribute("data-icon-style", "linear");
	await scene.click();
	await expect(scene).toBeChecked();
	await expect(videos).not.toBeChecked();
	const homeButton = page.getByRole("button", { name: "Home", exact: true });
	await expect(homeButton.locator("svg")).toHaveAttribute("data-icon-style", "bold");
	await homeButton.click();
	const home = page.getByRole("dialog", { name: "Projects dashboard" });
	await home.getByRole("button", { name: "Raw", exact: true }).click();
	await expect(home.getByRole("list", { name: "Raw files" }).locator("li")).toHaveCount(3);
	await expect(home.getByRole("textbox", { name: "Search projects" })).toHaveCount(0);
	await home.getByRole("textbox", { name: "Search raw files" }).fill("mic");
	await expect(home.getByRole("list", { name: "Raw files" }).locator("li")).toHaveCount(1);
	await home.getByRole("button", { name: "Show screen.mic.wav in folder" }).click();
	await expect(page.locator("html")).toHaveAttribute(
		"data-revealed",
		"/recordings/screen.mic.wav",
	);
	await page.screenshot({ path: "test-results/dashboard-raw.png" });
});

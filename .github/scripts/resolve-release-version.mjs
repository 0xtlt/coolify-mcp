import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const RELEASE_MODES = new Set(["auto", "current", "patch", "minor", "major"]);
const RELEASE_TYPES = new Map([
	["feat", "minor"],
	["fix", "patch"],
	["perf", "patch"],
	["revert", "patch"],
	["deps", "patch"],
]);

function parseVersion(version) {
	const match = VERSION_PATTERN.exec(version);

	if (!match) {
		throw new Error(`Expected a stable semantic version, received "${version}"`);
	}

	return match.slice(1).map(Number);
}

export function compareVersions(left, right) {
	const leftParts = parseVersion(left);
	const rightParts = parseVersion(right);

	for (let index = 0; index < leftParts.length; index += 1) {
		if (leftParts[index] !== rightParts[index]) {
			return leftParts[index] - rightParts[index];
		}
	}

	return 0;
}

export function bumpVersion(version, bump) {
	let [major, minor, patch] = parseVersion(version);

	if (bump === "major") {
		major += 1;
		minor = 0;
		patch = 0;
	} else if (bump === "minor") {
		minor += 1;
		patch = 0;
	} else if (bump === "patch") {
		patch += 1;
	} else {
		throw new Error(`Expected bump to be major, minor, or patch, received "${bump}"`);
	}

	return `${major}.${minor}.${patch}`;
}

function conventionalHeader(subject) {
	return /^(?<type>[A-Za-z][\w-]*)(?:\([^\r\n)]+\))?(?<breaking>!)?:\s+\S/.exec(subject);
}

export function determineAutomaticBump(commits) {
	let selectedBump = null;

	for (const commit of commits) {
		const header = conventionalHeader(commit.subject);
		const hasBreakingFooter = /(^|\r?\n)BREAKING(?:[ -]CHANGE):\s*\S/i.test(commit.body);

		if (header?.groups?.breaking || hasBreakingFooter) {
			return "major";
		}

		const releaseType = header?.groups?.type.toLowerCase();
		const bump = releaseType ? RELEASE_TYPES.get(releaseType) : undefined;

		if (bump === "minor") {
			selectedBump = "minor";
		} else if (bump === "patch" && selectedBump === null) {
			selectedBump = "patch";
		}
	}

	return selectedBump;
}

export function resolveRelease({ baseVersion, commits, currentVersion, mode }) {
	parseVersion(baseVersion);
	parseVersion(currentVersion);

	if (!RELEASE_MODES.has(mode)) {
		throw new Error(`Unknown release mode "${mode}"`);
	}

	if (mode === "current") {
		if (compareVersions(currentVersion, baseVersion) <= 0) {
			throw new Error(
				`Current package version ${currentVersion} must be newer than published version ${baseVersion}`,
			);
		}

		return {
			bump: "current",
			commitCount: commits.length,
			shouldRelease: true,
			version: currentVersion,
		};
	}

	const bump = mode === "auto" ? determineAutomaticBump(commits) : mode;

	if (bump === null) {
		return {
			bump: "none",
			commitCount: commits.length,
			shouldRelease: false,
			version: baseVersion,
		};
	}

	return {
		bump,
		commitCount: commits.length,
		shouldRelease: true,
		version: bumpVersion(baseVersion, bump),
	};
}

function readCommits(baseTag) {
	const log = execFileSync(
		"git",
		["log", "--format=%s%x1f%b%x1e", `${baseTag}..HEAD`],
		{ encoding: "utf8" },
	);

	return log
		.split("\x1e")
		.map((entry) => entry.trim())
		.filter(Boolean)
		.map((entry) => {
			const [subject, ...body] = entry.split("\x1f");
			return { body: body.join("\x1f").trim(), subject: subject.trim() };
		});
}

function parseArguments(arguments_) {
	const values = new Map();

	for (let index = 0; index < arguments_.length; index += 2) {
		const key = arguments_[index];
		const value = arguments_[index + 1];

		if (!key?.startsWith("--") || value === undefined) {
			throw new Error(
				"Usage: resolve-release-version.mjs --base-version <version> --base-tag <tag> --current-version <version> --mode <mode>",
			);
		}

		values.set(key.slice(2), value);
	}

	return values;
}

function main() {
	const arguments_ = parseArguments(process.argv.slice(2));
	const baseVersion = arguments_.get("base-version");
	const baseTag = arguments_.get("base-tag");
	const currentVersion = arguments_.get("current-version");
	const mode = arguments_.get("mode");

	if (!baseVersion || !baseTag || !currentVersion || !mode) {
		throw new Error(
			"Usage: resolve-release-version.mjs --base-version <version> --base-tag <tag> --current-version <version> --mode <mode>",
		);
	}

	const result = resolveRelease({
		baseVersion,
		commits: readCommits(baseTag),
		currentVersion,
		mode,
	});

	console.log(`should_release=${result.shouldRelease}`);
	console.log(`version=${result.version}`);
	console.log(`tag=v${result.version}`);
	console.log(`bump=${result.bump}`);
	console.log(`commit_count=${result.commitCount}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
	main();
}

import assert from "node:assert/strict";
import test from "node:test";

import {
	bumpVersion,
	compareVersions,
	determineAutomaticBump,
	resolveRelease,
} from "./resolve-release-version.mjs";

test("bumps stable semantic versions", () => {
	assert.equal(bumpVersion("4.0.0", "patch"), "4.0.1");
	assert.equal(bumpVersion("4.0.9", "minor"), "4.1.0");
	assert.equal(bumpVersion("4.9.9", "major"), "5.0.0");
});

test("compares stable semantic versions", () => {
	assert.equal(compareVersions("4.0.0", "4.0.0"), 0);
	assert.ok(compareVersions("4.0.1", "4.0.0") > 0);
	assert.ok(compareVersions("4.0.0", "4.1.0") < 0);
});

test("selects the largest conventional commit bump", () => {
	assert.equal(
		determineAutomaticBump([
			{ body: "", subject: "fix: handle empty responses" },
			{ body: "", subject: "feat(api): add server validation" },
		]),
		"minor",
	);

	assert.equal(
		determineAutomaticBump([
			{ body: "", subject: "feat!: remove legacy endpoint" },
			{ body: "", subject: "fix: handle empty responses" },
		]),
		"major",
	);

	assert.equal(
		determineAutomaticBump([
			{
				body: "BREAKING CHANGE: configuration keys were renamed",
				subject: "refactor: simplify configuration",
			},
		]),
		"major",
	);
});

test("ignores commits that do not publish a release", () => {
	assert.equal(
		determineAutomaticBump([
			{ body: "", subject: "docs: clarify installation" },
			{ body: "", subject: "chore: update CI" },
		]),
		null,
	);
});

test("resolves auto and explicit release modes", () => {
	const commits = [{ body: "", subject: "fix: handle empty responses" }];

	assert.deepEqual(
		resolveRelease({
			baseVersion: "4.0.0",
			commits,
			currentVersion: "4.0.0",
			mode: "auto",
		}),
		{ bump: "patch", commitCount: 1, shouldRelease: true, version: "4.0.1" },
	);

	assert.deepEqual(
		resolveRelease({
			baseVersion: "4.0.0",
			commits: [],
			currentVersion: "4.0.0",
			mode: "minor",
		}),
		{ bump: "minor", commitCount: 0, shouldRelease: true, version: "4.1.0" },
	);
});

test("uses the repository version for bootstrap releases", () => {
	assert.deepEqual(
		resolveRelease({
			baseVersion: "3.0.0",
			commits: [],
			currentVersion: "4.0.0",
			mode: "current",
		}),
		{ bump: "current", commitCount: 0, shouldRelease: true, version: "4.0.0" },
	);

	assert.throws(
		() =>
			resolveRelease({
				baseVersion: "4.0.0",
				commits: [],
				currentVersion: "4.0.0",
				mode: "current",
			}),
		/must be newer/,
	);
});

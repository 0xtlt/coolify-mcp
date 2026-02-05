import type { DeploymentLog } from "../types/api";

const LOG_LEVELS = ["debug", "info", "warn", "error", "fatal"] as const;
type LogLevel = (typeof LOG_LEVELS)[number];

export interface LogFilter {
	level?: LogLevel;
	since?: Date;
	until?: Date;
	search?: string;
	limit: number;
	tail: boolean;
}

function getLogLevelPriority(level: string): number {
	const index = LOG_LEVELS.indexOf(level.toLowerCase() as LogLevel);
	return index === -1 ? 1 : index; // default to "info" if unknown
}

export function filterLogs(logs: DeploymentLog[], filter: LogFilter): DeploymentLog[] {
	let result = [...logs];

	// Filter by log level (minimum level)
	if (filter.level) {
		const minPriority = getLogLevelPriority(filter.level);
		result = result.filter((log) => {
			const logPriority = getLogLevelPriority(log.level || "info");
			return logPriority >= minPriority;
		});
	}

	// Filter by time range
	if (filter.since) {
		const since = filter.since;
		result = result.filter((log) => new Date(log.timestamp) >= since);
	}

	if (filter.until) {
		const until = filter.until;
		result = result.filter((log) => new Date(log.timestamp) <= until);
	}

	// Filter by text search (case-insensitive)
	if (filter.search) {
		const searchLower = filter.search.toLowerCase();
		result = result.filter((log) => log.message.toLowerCase().includes(searchLower));
	}

	// Apply tail behavior (get most recent)
	if (filter.tail) {
		result = result.slice(-filter.limit);
	} else {
		result = result.slice(0, filter.limit);
	}

	return result;
}

/**
 * Parse raw log string into structured log entries
 * Handles common log formats like Docker container logs
 */
export function parseLogString(rawLogs: string): DeploymentLog[] {
	const lines = rawLogs.split("\n").filter((line) => line.trim());
	return lines.map((line) => {
		// Try to parse timestamp at beginning of line
		const timestampMatch = line.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[^\s]*)\s+(.*)$/);
		if (timestampMatch) {
			const [, timestamp, rest] = timestampMatch;
			// Try to extract log level
			const levelMatch = rest.match(/^\[?(DEBUG|INFO|WARN|ERROR|FATAL)\]?\s*:?\s*(.*)$/i);
			if (levelMatch) {
				const [, level, message] = levelMatch;
				return { timestamp, level: level.toLowerCase(), message };
			}
			return { timestamp, message: rest };
		}
		// Fallback: no timestamp, entire line is message
		return { timestamp: new Date().toISOString(), message: line };
	});
}

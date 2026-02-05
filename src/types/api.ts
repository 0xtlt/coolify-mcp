export interface Application {
	id: number;
	uuid: string;
	name: string;
	description?: string;
	fqdn?: string;
	status: "running" | "stopped" | "starting" | "stopping" | "error" | "exited";
	git_repository?: string;
	git_branch?: string;
	build_pack?: string;
	created_at: string;
	updated_at: string;
}

export interface Deployment {
	id: number;
	uuid: string;
	application_id: string;
	status: "queued" | "in_progress" | "finished" | "failed" | "cancelled";
	commit_sha?: string;
	commit_message?: string;
	started_at?: string;
	finished_at?: string;
	created_at: string;
}

export interface DeploymentLog {
	timestamp: string;
	level?: string;
	message: string;
	container?: string;
}

export interface ServerInfo {
	id: number;
	uuid: string;
	name: string;
	ip: string;
	user: string;
	port: number;
	created_at: string;
	updated_at: string;
}

export interface Application {
	uuid: string;
	name: string;
	description?: string;
	fqdn?: string;
	status: string; // Coolify uses composite format e.g. "running:healthy", "exited:unhealthy"
	git_repository?: string;
	git_branch?: string;
	build_pack?: string;
	created_at: string;
	updated_at: string;
}

export interface Deployment {
	deployment_uuid: string;
	application_id: number;
	status: string; // "queued" | "in_progress" | "finished" | "failed" | "cancelled-by-user"
	commit?: string;
	commit_message?: string;
	finished_at?: string;
	created_at: string;
	updated_at?: string;
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

// Summary types for list endpoints (token-efficient)

export interface ApplicationSummary {
	uuid: string;
	name: string;
	status: string;
	fqdn?: string;
	git_repository?: string;
	git_branch?: string;
}

export interface DeploymentSummary {
	deployment_uuid: string;
	application_id: number;
	status: string;
	commit?: string;
	created_at: string;
}

export interface ServerSummary {
	uuid: string;
	name: string;
	ip: string;
}

// --- Phase 1 types ---

export interface Database {
	uuid: string;
	name: string;
	description?: string;
	database_type: string; // e.g. "standalone-postgresql", "standalone-mysql", "standalone-redis"
	status: string;
	destination_id?: number;
	destination_type?: string;
	environment_id?: number;
	image?: string;
	is_public?: boolean;
	public_port?: number;
	created_at: string;
	updated_at: string;
}

export interface DatabaseSummary {
	uuid: string;
	name: string;
	database_type: string;
	status: string;
}

export interface Service {
	uuid: string;
	name: string;
	description?: string;
	status: string;
	service_type?: string;
	destination_id?: number;
	destination_type?: string;
	environment_id?: number;
	docker_compose_raw?: string;
	created_at: string;
	updated_at: string;
}

export interface ServiceSummary {
	uuid: string;
	name: string;
	status: string;
	service_type?: string;
}

export interface EnvironmentVariable {
	uuid: string;
	key: string;
	value: string;
	is_preview: boolean;
	is_literal: boolean;
	is_multiline: boolean;
	is_shown_once: boolean;
}

// Transformer functions

export function toApplicationSummary(app: Application): ApplicationSummary {
	return {
		uuid: app.uuid,
		name: app.name,
		status: app.status,
		fqdn: app.fqdn,
		git_repository: app.git_repository,
		git_branch: app.git_branch,
	};
}

export function toDeploymentSummary(dep: Deployment): DeploymentSummary {
	return {
		deployment_uuid: dep.deployment_uuid,
		application_id: dep.application_id,
		status: dep.status,
		commit: dep.commit,
		created_at: dep.created_at,
	};
}

export function toServerSummary(server: ServerInfo): ServerSummary {
	return {
		uuid: server.uuid,
		name: server.name,
		ip: server.ip,
	};
}

export function toDatabaseSummary(db: Database): DatabaseSummary {
	return {
		uuid: db.uuid,
		name: db.name,
		database_type: db.database_type,
		status: db.status,
	};
}

export function toServiceSummary(svc: Service): ServiceSummary {
	return {
		uuid: svc.uuid,
		name: svc.name,
		status: svc.status,
		service_type: svc.service_type,
	};
}

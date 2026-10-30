CREATE TABLE `activity_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`action` text NOT NULL,
	`entity` text NOT NULL,
	`entity_id` integer,
	`summary` text NOT NULL,
	`details` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `activity_entity_idx` ON `activity_logs` (`entity`,`entity_id`);--> statement-breakpoint
CREATE INDEX `activity_created_idx` ON `activity_logs` (`created_at`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `site_posts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`site_id` integer NOT NULL,
	`name` text NOT NULL,
	`position` text,
	`default_site_code` text,
	`default_start_time` text,
	`default_end_time` text,
	`active` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `site_posts_site_idx` ON `site_posts` (`site_id`);--> statement-breakpoint
CREATE TABLE `sites` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`note` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sites_name_unique` ON `sites` (`name`);--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`site_id` integer NOT NULL,
	`site_post_id` integer,
	`site_code` text,
	`absent_name` text NOT NULL,
	`position` text,
	`reason` text NOT NULL,
	`notified_date` text,
	`work_date` text NOT NULL,
	`coverage_type` text DEFAULT 'pending' NOT NULL,
	`substitute_id` integer,
	`substitute_name` text,
	`staff_type` text,
	`start_time` text,
	`end_time` text,
	`wage` integer,
	`pay_status` text DEFAULT 'pending' NOT NULL,
	`status` text DEFAULT 'todo' NOT NULL,
	`note` text,
	`created_by` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`site_post_id`) REFERENCES `site_posts`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`substitute_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `tasks_work_date_idx` ON `tasks` (`work_date`);--> statement-breakpoint
CREATE INDEX `tasks_site_idx` ON `tasks` (`site_id`);--> statement-breakpoint
CREATE INDEX `tasks_substitute_idx` ON `tasks` (`substitute_id`);--> statement-breakpoint
CREATE INDEX `tasks_status_idx` ON `tasks` (`status`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`full_name` text NOT NULL,
	`nickname` text,
	`role` text DEFAULT 'employee' NOT NULL,
	`staff_type` text,
	`phone` text,
	`default_wage` integer,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);
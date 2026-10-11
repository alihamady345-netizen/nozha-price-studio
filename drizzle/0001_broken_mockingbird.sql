CREATE TABLE `offers` (
	`id` text PRIMARY KEY NOT NULL,
	`brand` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`search_text` text NOT NULL,
	`data_json` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_offers_brand_end_start` ON `offers` (`brand`,`end_date`,`start_date`);
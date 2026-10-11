CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`name_en` text DEFAULT '' NOT NULL,
	`unit` text DEFAULT '' NOT NULL,
	`unit_en` text DEFAULT '' NOT NULL,
	`price` text NOT NULL,
	`barcode` text NOT NULL,
	`format` text NOT NULL,
	`search_text` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_products_barcode` ON `products` (`barcode`);--> statement-breakpoint
CREATE INDEX `idx_products_updated_at` ON `products` (`updated_at`);
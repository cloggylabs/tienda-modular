ALTER TABLE `order_items` ADD `stock_taken` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `carrier` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `tracking_number` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `stock_applied` integer DEFAULT false NOT NULL;
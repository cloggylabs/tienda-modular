CREATE TABLE `order_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`store_id` integer NOT NULL,
	`order_id` integer NOT NULL,
	`product_id` integer,
	`variant_id` text,
	`name` text NOT NULL,
	`variant_name` text DEFAULT '' NOT NULL,
	`unit_price` integer NOT NULL,
	`quantity` integer NOT NULL,
	`image` text,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `order_items_order_idx` ON `order_items` (`order_id`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`store_id` integer NOT NULL,
	`number` integer NOT NULL,
	`token` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`payment_method` text NOT NULL,
	`payment_status` text DEFAULT 'pending' NOT NULL,
	`customer_name` text NOT NULL,
	`phone` text NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`department` text NOT NULL,
	`city` text NOT NULL,
	`address` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`shipping_zone` text NOT NULL,
	`shipping_cost` integer,
	`subtotal` integer NOT NULL,
	`total` integer NOT NULL,
	`receipt_key` text,
	`receipt_type` text,
	`receipt_at` integer,
	`admin_note` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_token_unique` ON `orders` (`token`);--> statement-breakpoint
CREATE UNIQUE INDEX `orders_store_number_idx` ON `orders` (`store_id`,`number`);--> statement-breakpoint
CREATE INDEX `orders_store_status_idx` ON `orders` (`store_id`,`status`,`created_at`);
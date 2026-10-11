import { sqliteTable, text, integer, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
export const products = sqliteTable('products',{
 id:text('id').primaryKey(),
 name:text('name').notNull().default(''),
 nameEn:text('name_en').notNull().default(''),
 unit:text('unit').notNull().default(''),
 unitEn:text('unit_en').notNull().default(''),
 price:text('price').notNull(),
 barcode:text('barcode').notNull(),
 format:text('format').notNull(),
 searchText:text('search_text').notNull(),
 version:integer('version').notNull().default(1),
 createdAt:text('created_at').notNull(),
 updatedAt:text('updated_at').notNull()
},table=>[uniqueIndex('idx_products_barcode').on(table.barcode),index('idx_products_updated_at').on(table.updatedAt)]);
export const offers = sqliteTable('offers', {
 id:text('id').primaryKey(),
 brand:text('brand').notNull(),
 startDate:text('start_date').notNull(),
 endDate:text('end_date').notNull(),
 searchText:text('search_text').notNull(),
 dataJson:text('data_json').notNull(),
 version:integer('version').notNull().default(1),
 createdAt:text('created_at').notNull(),
 updatedAt:text('updated_at').notNull()
},table=>[index('idx_offers_brand_end_start').on(table.brand,table.endDate,table.startDate)]);

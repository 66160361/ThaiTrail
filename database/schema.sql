-- Database Schema for ThaiTrail
-- Resets database and configures schema for all tables

SET foreign_key_checks = 0;

-- 1. Drop existing tables if they exist
DROP TABLE IF EXISTS `user_place_scores`;
DROP TABLE IF EXISTS `place_images`;
DROP TABLE IF EXISTS `user_signals`;
DROP TABLE IF EXISTS `user_interests`;
DROP TABLE IF EXISTS `mapping_review`;
DROP TABLE IF EXISTS `mapping_rules`;
DROP TABLE IF EXISTS `tourism_types`;
DROP TABLE IF EXISTS `categories`;
DROP TABLE IF EXISTS `places`;
DROP TABLE IF EXISTS `users`;

-- 2. Create tables
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `google_id` varchar(100) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `onboarded` tinyint(1) NOT NULL DEFAULT '0',
  `name` varchar(255) DEFAULT NULL,
  `given_name` varchar(255) DEFAULT NULL,
  `family_name` varchar(255) DEFAULT NULL,
  `picture` text,
  `last_login_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `avatar_url` mediumtext,
  `role` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `google_id` (`google_id`),
  KEY `idx_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `places` (
  `id` int NOT NULL AUTO_INCREMENT,
  `place_code` varchar(100) NOT NULL,
  `place_name` varchar(255) NOT NULL,
  `description` text,
  `latitude` double DEFAULT NULL,
  `longitude` double DEFAULT NULL,
  `subdistrict` varchar(255) DEFAULT NULL,
  `district` varchar(255) DEFAULT NULL,
  `province` varchar(255) DEFAULT NULL,
  `image_url` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `place_code` (`place_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `category_name` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `tourism_types` (
  `id` int NOT NULL AUTO_INCREMENT,
  `place_id` int NOT NULL,
  `category_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_place_category` (`place_id`,`category_id`),
  KEY `fk_tourism_category` (`category_id`),
  CONSTRAINT `fk_tourism_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tourism_place` FOREIGN KEY (`place_id`) REFERENCES `places` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `mapping_rules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `keyword` varchar(255) NOT NULL,
  `category_id` int NOT NULL,
  `rule_type` varchar(50) NOT NULL DEFAULT 'contains',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `mapping_review` (
  `id` int NOT NULL AUTO_INCREMENT,
  `place_code` varchar(100) NOT NULL,
  `place_name` varchar(255) NOT NULL,
  `description` text,
  `raw_json_data` text,
  `status` varchar(50) NOT NULL DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_review_place` (`place_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `user_interests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `category_id` int NOT NULL,
  `weight` decimal(8,2) NOT NULL DEFAULT '1.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_category` (`user_id`,`category_id`),
  KEY `idx_user_interests_user` (`user_id`),
  KEY `category_id` (`category_id`),
  CONSTRAINT `user_interests_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_interests_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `user_signals` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `place_id` int NOT NULL,
  `signal_type` enum('view','like','save','share','dismiss') NOT NULL,
  `platform` varchar(50) DEFAULT NULL,
  `duration_seconds` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_signals_user` (`user_id`,`signal_type`),
  KEY `idx_user_signals_place` (`place_id`,`signal_type`),
  CONSTRAINT `user_signals_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_signals_ibfk_2` FOREIGN KEY (`place_id`) REFERENCES `places` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `place_images` (
  `id` int NOT NULL AUTO_INCREMENT,
  `place_id` int NOT NULL,
  `image_url` text NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `place_id` (`place_id`),
  CONSTRAINT `place_images_ibfk_1` FOREIGN KEY (`place_id`) REFERENCES `places` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `user_place_scores` (
  `user_id` int NOT NULL,
  `place_id` int NOT NULL,
  `score` float NOT NULL DEFAULT '0',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`,`place_id`),
  KEY `idx_user_score` (`user_id`,`score` DESC),
  KEY `idx_place` (`place_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Seed initial categories
INSERT INTO `categories` (`id`, `category_name`) VALUES
(1, 'ศาสนาและความเชื่อ'),
(2, 'ธรรมชาติและผจญภัย'),
(3, 'ทะเลและเกาะ'),
(4, 'สวนสัตว์'),
(5, 'ถ่ายภาพ'),
(6, 'ประวัติศาสตร์และวัฒนธรรม'),
(7, 'อาหารคาเฟ่และไลฟ์สไตล์'),
(8, 'ประเพณีและเทศกาล')
ON DUPLICATE KEY UPDATE `category_name` = VALUES(`category_name`);

-- 4. Seed mapping rules
INSERT INTO `mapping_rules` (`keyword`, `category_id`, `rule_type`) VALUES
('วัด', 1, 'contains'),
('สำนักสงฆ์', 1, 'contains'),
('เจดีย์', 1, 'contains'),
('โบสถ์', 1, 'contains'),
('มัสยิด', 1, 'contains'),
('ศาลเจ้า', 1, 'contains'),
('พระธาตุ', 1, 'contains'),
('พระพุทธรูป', 1, 'contains'),
('สิม', 1, 'contains'),
('น้ำตก', 2, 'contains'),
('ภูเขา', 2, 'contains'),
('อุทยานแห่งชาติ', 2, 'contains'),
('ถ้ำ', 2, 'contains'),
('ป่า', 2, 'contains'),
('ดอย', 2, 'contains'),
('อ่างเก็บน้ำ', 2, 'contains'),
('เขื่อน', 2, 'contains'),
('ธรรมชาติ', 2, 'contains'),
('ห้วย', 2, 'contains'),
('ล่องแก่ง', 2, 'contains'),
('บ่อน้ำ', 2, 'contains'),
('บ่อพันขัน', 2, 'contains'),
('บึง', 2, 'contains'),
('หนอง', 2, 'contains'),
('ทะเล', 3, 'contains'),
('เกาะ', 3, 'contains'),
('หาด', 3, 'contains'),
('ชายหาด', 3, 'contains'),
('แหลม', 3, 'contains'),
('อ่าว', 3, 'contains'),
('สวนสัตว์', 4, 'contains'),
('สัตว์ป่า', 4, 'contains'),
('ฟาร์มสัตว์', 4, 'contains'),
('อควาเรียม', 4, 'contains'),
('จุดชมวิว', 5, 'contains'),
('สวนดอกไม้', 5, 'contains'),
('ทุ่งดอกไม้', 5, 'contains'),
('แลนด์มาร์ค', 5, 'contains'),
('สะพานไม้', 5, 'contains'),
('สะพาน', 5, 'contains'),
('พิพิธภัณฑ์', 6, 'contains'),
('โบราณสถาน', 6, 'contains'),
('ปราสาทหิน', 6, 'contains'),
('ปราสาท', 6, 'contains'),
('แหล่งโบราณคดี', 6, 'contains'),
('หอศิลป์', 6, 'contains'),
('กู่', 6, 'contains'),
('โบราณวัตถุ', 6, 'contains'),
('อนุสาวรีย์', 6, 'contains'),
('แหล่งประวัติศาสตร์', 6, 'contains'),
('คาเฟ่', 7, 'contains'),
('ร้านอาหาร', 7, 'contains'),
('ตลาด', 7, 'contains'),
('ตลาดน้ำ', 7, 'contains'),
('ถนนคนเดิน', 7, 'contains'),
('ห้าง', 7, 'contains'),
('ประเพณี', 8, 'contains'),
('เทศกาล', 8, 'contains'),
('งานวัด', 8, 'contains'),
('แห่เทียน', 8, 'contains'),
('ลอยกระทง', 8, 'contains'),
('สงกรานต์', 8, 'contains');

SET foreign_key_checks = 1;

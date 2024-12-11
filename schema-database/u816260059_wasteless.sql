-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: Dec 11, 2024 at 04:41 PM
-- Server version: 10.11.10-MariaDB
-- PHP Version: 7.2.34

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `u816260059_wasteless`
--

-- --------------------------------------------------------

--
-- Table structure for table `address`
--

CREATE TABLE `address` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `kabupaten` varchar(100) DEFAULT NULL,
  `kecamatan` varchar(100) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `code_pos` int(11) DEFAULT NULL,
  `photo_ktp` varchar(255) DEFAULT NULL,
  `photo_usaha` varchar(255) DEFAULT NULL,
  `province` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `address`
--

INSERT INTO `address` (`id`, `user_id`, `kabupaten`, `kecamatan`, `address`, `code_pos`, `photo_ktp`, `photo_usaha`, `province`) VALUES
(1, 5, 'cilacap', 'Nusawungu', 'dusun jetis', 20937, NULL, NULL, NULL),
(2, 6, 'KABUPATEN CILACAP', 'NUSAWUNGU', 'jl suryanegara rt 02 rw 02, dusun jetis', 20937, NULL, NULL, 'JAWA TENGAH'),
(4, 8, 'KABUPATEN CILACAP', 'NUSAWUNGU', 'teszt', 12345, NULL, NULL, 'JAWA TENGAH'),
(5, 9, 'KABUPATEN CILACAP', 'NUSAWUNGU', 'jl suryanegara rt 02 rw 02, dusun jetis', 20937, '1732933506665-176658581.jpg', '1732933506666-99493438.png', 'JAWA TENGAH'),
(7, 11, 'KABUPATEN CILACAP', 'NUSAWUNGU', 'jl siapa gatau', 26371, '1733840667842-996422245.jpeg', '1733840667860-797987825.jpeg', 'JAWA TENGAH'),
(9, 13, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(10, 14, 'KABUPATEN BREBES', 'BUMIAYU', 'bumiayu langkap', 55441, '1733924708917-167111561.png', '1733924708921-613296682.png', 'JAWA TENGAH');

-- --------------------------------------------------------

--
-- Table structure for table `carts`
--

CREATE TABLE `carts` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `carts`
--

INSERT INTO `carts` (`id`, `user_id`, `created_at`, `updated_at`) VALUES
(2, 5, '2024-11-27 11:33:11', '2024-11-27 11:33:11'),
(3, 8, '2024-11-30 02:38:05', '2024-11-30 02:38:05'),
(4, 13, '2024-12-11 12:46:00', '2024-12-11 12:46:00');

-- --------------------------------------------------------

--
-- Table structure for table `cart_items`
--

CREATE TABLE `cart_items` (
  `id` int(11) NOT NULL,
  `cart_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `cart_items`
--

INSERT INTO `cart_items` (`id`, `cart_id`, `product_id`, `quantity`, `created_at`) VALUES
(8, 3, 2, 1, '2024-11-30 02:38:23');

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `slug` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `categories`
--

INSERT INTO `categories` (`id`, `name`, `slug`) VALUES
(1, 'Vegetable', 'vegetable'),
(2, 'Pupuk', 'pupuk'),
(3, 'Expired', 'expired'),
(4, 'Jajanan', 'jajanan');

-- --------------------------------------------------------

--
-- Table structure for table `photos`
--

CREATE TABLE `photos` (
  `id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `photo` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `photos`
--

INSERT INTO `photos` (`id`, `product_id`, `photo`, `created_at`) VALUES
(1, 1, 'product-1732386043725.jpg', '2024-11-23 18:20:43'),
(2, 1, 'product-1732387856784.png', '2024-11-23 18:50:56'),
(3, 1, 'product-1732387959158.jpg', '2024-11-23 18:52:39'),
(4, 1, 'product-1732388240667.jpg', '2024-11-23 18:57:20'),
(7, 1, 'product-1732505955902.jpg', '2024-11-25 03:39:15'),
(8, 2, 'product-1732802860731.png', '2024-11-28 14:07:40'),
(11, 7, 'product-1733920915188.jpg', '2024-12-11 12:41:55'),
(12, 8, 'product-1733927313831.jpg', '2024-12-11 14:28:34');

-- --------------------------------------------------------

--
-- Table structure for table `prices`
--

CREATE TABLE `prices` (
  `id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `price` int(11) NOT NULL,
  `is_discount` tinyint(1) DEFAULT NULL,
  `discount_percentage` int(11) DEFAULT NULL,
  `discount_price` int(11) DEFAULT NULL,
  `start_date` timestamp NULL DEFAULT NULL,
  `end_date` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `prices`
--

INSERT INTO `prices` (`id`, `product_id`, `price`, `is_discount`, `discount_percentage`, `discount_price`, `start_date`, `end_date`, `created_at`) VALUES
(10, 2, 120000, NULL, NULL, NULL, NULL, NULL, '2024-11-28 14:07:40'),
(12, 1, 254800, 1, 25, 191100, '2024-11-15 17:00:00', '2024-11-21 17:00:00', '2024-12-11 02:35:46'),
(13, 7, 25000, 1, 40, 15000, '2024-12-11 00:00:00', '2024-12-12 00:00:00', '2024-12-11 12:41:55'),
(19, 8, 20000, 1, 10, 18000, '2024-12-12 00:00:00', '2024-12-16 00:00:00', '2024-12-11 15:04:21');

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `id` int(11) NOT NULL,
  `seller_id` int(11) NOT NULL,
  `category_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `photo_id` int(11) DEFAULT NULL,
  `quantity` int(11) NOT NULL DEFAULT 0,
  `massa` int(11) NOT NULL,
  `expired` timestamp NOT NULL,
  `is_active` tinyint(1) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`id`, `seller_id`, `category_id`, `name`, `slug`, `photo_id`, `quantity`, `massa`, `expired`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 2, 2, 'Sayur Segar Update', 'sayur-segar-update', 7, 1197, 150, '2024-11-28 17:00:00', 1, '2024-11-23 18:20:43', '2024-12-11 02:35:46'),
(2, 6, 1, 'Buah Buahan', 'buah-buahan', 8, 116, 400, '2024-12-27 17:00:00', 1, '2024-11-28 14:07:40', '2024-12-11 12:47:54'),
(7, 4, 4, 'Pukis', 'pukis', 11, 3, 10, '2024-12-12 00:00:00', 1, '2024-12-11 12:41:55', '2024-12-11 12:41:55'),
(8, 6, 4, 'Cookies', 'cookies', 12, 9, 10, '2024-12-23 00:00:00', 1, '2024-12-11 14:28:34', '2024-12-11 15:22:40');

-- --------------------------------------------------------

--
-- Table structure for table `transactions`
--

CREATE TABLE `transactions` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `total_amount` int(11) NOT NULL,
  `payment_method` enum('cod','midtrans') NOT NULL,
  `payment_status` enum('pending','paid','failed') DEFAULT 'pending',
  `status` enum('pending','paid','delivered','cancelled') DEFAULT 'pending',
  `midtrans_order_id` varchar(100) DEFAULT NULL,
  `midtrans_transaction_id` varchar(100) DEFAULT NULL,
  `midtrans_status_code` varchar(10) DEFAULT NULL,
  `midtrans_transaction_status` varchar(50) DEFAULT NULL,
  `midtrans_fraud_status` varchar(20) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `ppn` int(11) NOT NULL DEFAULT 0,
  `address_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `transactions`
--

INSERT INTO `transactions` (`id`, `user_id`, `total_amount`, `payment_method`, `payment_status`, `status`, `midtrans_order_id`, `midtrans_transaction_id`, `midtrans_status_code`, `midtrans_transaction_status`, `midtrans_fraud_status`, `created_at`, `updated_at`, `ppn`, `address_id`) VALUES
(4, 5, 135000, 'cod', 'paid', 'delivered', NULL, NULL, NULL, NULL, NULL, '2024-11-29 02:56:42', '2024-12-04 15:46:58', 15000, 1),
(5, 5, 120840, 'cod', 'pending', 'delivered', NULL, NULL, NULL, NULL, NULL, '2024-12-04 15:29:33', '2024-12-11 08:44:36', 840, 1),
(9, 5, 120840, 'midtrans', 'paid', 'delivered', 'ORDER-9-1733327917234', '7ee46faa-1130-4e26-8be8-60624f4f6cbc', '200', 'settlement', 'accept', '2024-12-04 15:58:37', '2024-12-11 08:59:16', 840, 1),
(10, 13, 120840, 'midtrans', 'paid', 'pending', 'ORDER-10-1733921274206', '6d79573f-7023-4e63-b16b-b6f182c02d36', '200', 'settlement', 'accept', '2024-12-11 12:47:53', '2024-12-11 12:48:41', 840, 9),
(11, 13, 18126, 'midtrans', 'pending', 'pending', 'ORDER-11-1733930560576', NULL, NULL, NULL, NULL, '2024-12-11 15:22:40', '2024-12-11 15:22:41', 126, 9);

-- --------------------------------------------------------

--
-- Table structure for table `transaction_items`
--

CREATE TABLE `transaction_items` (
  `id` int(11) NOT NULL,
  `transaction_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  `price` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `transaction_items`
--

INSERT INTO `transaction_items` (`id`, `transaction_id`, `product_id`, `quantity`, `price`, `created_at`) VALUES
(4, 4, 2, 1, 120000, '2024-11-29 02:56:42'),
(5, 5, 2, 1, 120000, '2024-12-04 15:29:33'),
(9, 9, 2, 1, 120000, '2024-12-04 15:58:37'),
(10, 10, 2, 1, 120000, '2024-12-11 12:47:53'),
(11, 11, 8, 1, 18000, '2024-12-11 15:22:40');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `role` enum('admin','seller','user') DEFAULT 'user',
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `password`, `phone`, `role`, `is_active`, `created_at`, `updated_at`) VALUES
(2, 'Admin', 'demoadminhackathon2024@gmail.com', '$2a$10$hed9unxBx.yX6gQVxGDiXOm9U9VaCQz0Ov.LGPfmJuMp8fG8nVXs2', '11223344555', 'admin', 1, '2024-11-22 03:04:32', '2024-12-11 16:14:50'),
(3, 'arvel', 'arvel@gmail.com', '$2a$10$BBlS3ABR42HuFGPK6PIY4.Ax9c9xYwZrOsSCGiSsP3DwfKl1ltpKa', '1122334455', 'user', 1, '2024-11-25 02:27:00', '2024-11-25 16:55:27'),
(4, 'aryanob', 'arya@gmail.com', '$2a$10$E7zRRNqIqQpThbjloyTb.exDG2snh82wo30XZy8ulZq/rswdgZZbW', '62123456789', 'admin', 1, '2024-11-25 03:37:07', '2024-11-25 16:58:14'),
(5, 'Dika', 'dikagilang2007@gmail.com', '$2a$10$A.g2NSs0u6MMJZ1QaKUn3eeR7g0tA/lH.Cy2LE0Prz/jzckpdc5RO', '6281227848422', 'user', 1, '2024-11-27 09:48:05', '2024-11-27 09:48:05'),
(6, 'nuha', 'intechofficialteam@gmail.com', '$2a$10$KHPKFzBEp26j7mfQoHJ85uA1gkaNMg5R/qxLLXxSWJL.KxEBmX1I6', '62123456789', 'seller', 1, '2024-11-28 13:19:40', '2024-11-30 02:27:55'),
(8, 'dika2', 'dikajetis1234@gmail.com', '$2a$10$eclQV3DLa.qKInn3.GBX.eTZ3qZJmYXSv2oPhcCYKTgahSd8cyr.2', '23434345524', 'user', 1, '2024-11-30 02:36:32', '2024-11-30 02:36:32'),
(9, 'Danis', 'dikaminecraft2007@gmail.com', '$2a$10$ElxKBAI25/Vy5W/APpRcouDMMQvATeGkLlVz49ftlPP5PaI1tNPIG', '628719374552', 'seller', 1, '2024-12-02 15:11:02', '2024-12-10 14:25:33'),
(11, 'Dika', 'dikagenshin12345@gmail.com', '$2a$10$buQKIVQ2B0mqNuuoAjVwR.YfRiEBfFX2sCT7J3.MsWZp7vrC9EzwW', '081227848422', 'seller', 1, '2024-12-10 14:24:27', '2024-12-11 03:49:21'),
(13, 'Sofwan Nuha Al Faruq', 'sofwannuhaalfaruq@gmail.com', '$2a$10$oWLVAA.r6sDQuIqyxmTdwuJXIj8Kla0IUt7wMmgBBsqIspskVPol6', '082327278446', 'user', 1, '2024-12-11 12:32:14', '2024-12-11 12:32:14'),
(14, 'Sofwan Nuha ', 'sofwannuha3321@gmail.com', '$2a$10$/Ilenlyd6MWda8QgiK6fE.7B1ryEXqOb5jSjZxD04EdQi9Xgm.q2C', '082327278446', 'seller', 1, '2024-12-11 13:45:09', '2024-12-11 13:46:02');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `address`
--
ALTER TABLE `address`
  ADD PRIMARY KEY (`id`),
  ADD KEY `address_ibfk_1` (`user_id`),
  ADD KEY `idx_kecamatan` (`kecamatan`);

--
-- Indexes for table `carts`
--
ALTER TABLE `carts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `cart_items`
--
ALTER TABLE `cart_items`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_cart_product` (`cart_id`,`product_id`),
  ADD KEY `product_id` (`product_id`);

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `slug` (`slug`);

--
-- Indexes for table `photos`
--
ALTER TABLE `photos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `product_id` (`product_id`);

--
-- Indexes for table `prices`
--
ALTER TABLE `prices`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_price_product` (`product_id`,`start_date`,`end_date`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `slug` (`slug`),
  ADD KEY `photo_id` (`photo_id`),
  ADD KEY `idx_product_seller` (`seller_id`),
  ADD KEY `idx_product_category` (`category_id`);

--
-- Indexes for table `transactions`
--
ALTER TABLE `transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `address_id` (`address_id`);

--
-- Indexes for table `transaction_items`
--
ALTER TABLE `transaction_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `transaction_id` (`transaction_id`),
  ADD KEY `product_id` (`product_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `address`
--
ALTER TABLE `address`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `carts`
--
ALTER TABLE `carts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `cart_items`
--
ALTER TABLE `cart_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `photos`
--
ALTER TABLE `photos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `prices`
--
ALTER TABLE `prices`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `transactions`
--
ALTER TABLE `transactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `transaction_items`
--
ALTER TABLE `transaction_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `address`
--
ALTER TABLE `address`
  ADD CONSTRAINT `address_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `carts`
--
ALTER TABLE `carts`
  ADD CONSTRAINT `carts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `cart_items`
--
ALTER TABLE `cart_items`
  ADD CONSTRAINT `cart_items_ibfk_1` FOREIGN KEY (`cart_id`) REFERENCES `carts` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `cart_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `photos`
--
ALTER TABLE `photos`
  ADD CONSTRAINT `photos_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `prices`
--
ALTER TABLE `prices`
  ADD CONSTRAINT `prices_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `products`
--
ALTER TABLE `products`
  ADD CONSTRAINT `products_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`),
  ADD CONSTRAINT `products_ibfk_2` FOREIGN KEY (`seller_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `products_ibfk_3` FOREIGN KEY (`photo_id`) REFERENCES `photos` (`id`);

--
-- Constraints for table `transactions`
--
ALTER TABLE `transactions`
  ADD CONSTRAINT `transactions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `transactions_ibfk_2` FOREIGN KEY (`address_id`) REFERENCES `address` (`id`);

--
-- Constraints for table `transaction_items`
--
ALTER TABLE `transaction_items`
  ADD CONSTRAINT `transaction_items_ibfk_1` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `transaction_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

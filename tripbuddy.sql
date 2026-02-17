-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Feb 15, 2026 at 08:47 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";
SET FOREIGN_KEY_CHECKS = 0;


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `tripbuddy`
--
CREATE DATABASE IF NOT EXISTS `tripbuddy` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `tripbuddy`;

-- --------------------------------------------------------

--
-- Table structure for table `booking_details`
--

CREATE TABLE `booking_details` (
  `id` int(11) NOT NULL,
  `trip_id` int(11) DEFAULT NULL,
  `booking_id` varchar(100) DEFAULT NULL,
  `property_name` varchar(255) DEFAULT NULL,
  `amount_paid` decimal(10,2) DEFAULT NULL,
  `checkin_date` date DEFAULT NULL,
  `checkout_date` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `booking_details`
--

INSERT INTO `booking_details` (`id`, `trip_id`, `booking_id`, `property_name`, `amount_paid`, `checkin_date`, `checkout_date`) VALUES
(1, 1, 'GOAVGT33231', 'Goa, Vagator PLUS', 5921.50, '2026-02-24', '2026-02-26');

-- --------------------------------------------------------

--
-- Table structure for table `expenses`
--

CREATE TABLE `expenses` (
  `id` int(11) NOT NULL,
  `trip_id` int(11) DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `amount` decimal(10,2) DEFAULT NULL,
  `paid_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `category` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `expense_splits`
--

CREATE TABLE `expense_splits` (
  `id` int(11) NOT NULL,
  `expense_id` int(11) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `share_amount` decimal(10,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `itinerary`
--

CREATE TABLE `itinerary` (
  `id` int(11) NOT NULL,
  `trip_id` int(11) DEFAULT NULL,
  `day_number` int(11) DEFAULT NULL,
  `day` int(11) DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `map_link` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `itinerary`
--

INSERT INTO `itinerary` (`id`, `trip_id`, `day_number`, `title`, `location`, `description`, `map_link`) VALUES
(1, 1, 1, 'Calangute Beach', 'Calangute', 'Relax at beach and explore area', 'https://maps.google.com/?q=Calangute Beach'),
(2, 1, 1, 'Anjuna Beach', 'Anjuna', 'Sunset and beach vibes', 'https://maps.google.com/?q=Anjuna Beach'),
(3, 1, 2, 'Museum of Goa', 'MoG', 'Art museum visit', 'https://maps.google.com/?q=Museum of Goa'),
(4, 1, 3, 'Cabo de Rama Fort', 'South Goa', 'Fort + kayaking', 'https://maps.google.com/?q=Cabo de Rama Fort');

UPDATE `itinerary` SET `day` = `day_number` WHERE `day` IS NULL;

-- --------------------------------------------------------

--
-- Table structure for table `payments`
--

CREATE TABLE `payments` (
  `id` int(11) NOT NULL,
  `trip_id` int(11) DEFAULT NULL,
  `from_user` int(11) DEFAULT NULL,
  `to_user` int(11) DEFAULT NULL,
  `amount` decimal(10,2) DEFAULT NULL,
  `status` enum('pending','confirmed') DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `payments`
--

INSERT INTO `payments` (`id`, `trip_id`, `from_user`, `to_user`, `amount`, `status`, `created_at`) VALUES
(1, 1, 2, 1, 419.00, 'confirmed', '2026-02-15 19:06:06'),
(2, 1, 5, 1, 419.00, 'confirmed', '2026-02-15 19:06:06'),
(3, 1, 6, 1, 419.00, 'confirmed', '2026-02-15 19:06:06'),
(4, 1, 7, 1, 419.00, 'confirmed', '2026-02-15 19:06:06'),
(5, 1, 4, 1, 419.00, 'confirmed', '2026-02-15 19:06:06');

-- --------------------------------------------------------

--
-- Table structure for table `train_details`
--

CREATE TABLE `train_details` (
  `id` int(11) NOT NULL,
  `trip_id` int(11) DEFAULT NULL,
  `direction` varchar(50) DEFAULT NULL,
  `train_number` varchar(50) DEFAULT NULL,
  `departure` varchar(255) DEFAULT NULL,
  `arrival` varchar(255) DEFAULT NULL,
  `cost_per_person` decimal(10,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `train_details`
--

INSERT INTO `train_details` (`id`, `trip_id`, `direction`, `train_number`, `departure`, `arrival`, `cost_per_person`) VALUES
(1, 1, 'Going', '17309 - Vasco Da Gama Express', 'Tumkur 4:20 PM', 'Vasco 5:00 AM', 419.00),
(2, 1, 'Return', '17310 - Yesvantpur Express', 'Vasco 10:55 PM', 'Tumkur 10:36 AM', 419.00);

-- --------------------------------------------------------

--
-- Table structure for table `trips`
--

CREATE TABLE `trips` (
  `id` int(11) NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `trips`
--

INSERT INTO `trips` (`id`, `title`, `description`, `created_by`, `created_at`) VALUES
(1, 'Goa 2026', 'Goa trip with friends', 1, '2026-02-13 18:31:16');

-- --------------------------------------------------------

--
-- Table structure for table `trip_budget`
--

CREATE TABLE `trip_budget` (
  `id` int(11) NOT NULL,
  `trip_id` int(11) DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL,
  `estimated_min` decimal(10,2) DEFAULT NULL,
  `estimated_max` decimal(10,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `trip_budget`
--

INSERT INTO `trip_budget` (`id`, `trip_id`, `category`, `estimated_min`, `estimated_max`) VALUES
(1, 1, 'Train', 838.00, 838.00),
(2, 1, 'Scooter Rent', 600.00, 600.00),
(3, 1, 'Petrol', 400.00, 600.00),
(4, 1, 'Stay', 1000.00, 1500.00),
(5, 1, 'Activities', 1500.00, 2000.00),
(6, 1, 'Food', 2400.00, 3000.00),
(7, 1, 'Miscellaneous', 300.00, 500.00),
(8, 1, 'Train', 838.00, 838.00),
(9, 1, 'Scooter Rent', 600.00, 600.00),
(10, 1, 'Petrol', 400.00, 600.00),
(11, 1, 'Stay', 1000.00, 1500.00),
(12, 1, 'Activities', 1500.00, 2000.00),
(13, 1, 'Food', 2400.00, 3000.00),
(14, 1, 'Miscellaneous', 300.00, 500.00);

-- --------------------------------------------------------

--
-- Table structure for table `trip_members`
--

CREATE TABLE `trip_members` (
  `id` int(11) NOT NULL,
  `trip_id` int(11) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `status` enum('pending','approved') DEFAULT 'pending'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `trip_members`
--

INSERT INTO `trip_members` (`id`, `trip_id`, `user_id`, `status`) VALUES
(1, 1, 1, 'approved'),
(2, 1, 2, 'approved'),
(3, 1, 1, 'pending'),
(4, 1, 2, 'pending'),
(5, 1, 4, 'pending'),
(6, 1, 5, 'pending'),
(7, 1, 6, 'pending'),
(8, 1, 7, 'pending'),
(9, 1, 8, 'pending');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `password`, `created_at`) VALUES
(1, 'Venkatesha S', 'venky@test.com', '$2b$10$64A5qCREk50/zh5FqRsXA.E8UP7HDpr4gwk0rOZP0jfd56wyrK2q2', '2026-02-13 15:36:38'),
(2, 'Lakshmisha K N', 'lakshmi@test.com', '$2b$10$gtV4unPVJLQCNVdIAN/73u.K8/aYTJixXp8PVcAkJTk0Yw5YJB6ra', '2026-02-13 18:35:43'),
(4, 'Meghana Raj S N', NULL, NULL, '2026-02-15 18:54:42'),
(5, 'Monika S', NULL, NULL, '2026-02-15 18:54:42'),
(6, 'Venkatesh S', NULL, NULL, '2026-02-15 18:54:42'),
(7, 'Bhoomika T M', NULL, NULL, '2026-02-15 18:54:42'),
(8, 'Pranav Srivatsa D M', NULL, NULL, '2026-02-15 18:54:42');

-- --------------------------------------------------------

--
-- Table structure for table `vehicle_booking`
--

CREATE TABLE `vehicle_booking` (
  `id` int(11) NOT NULL,
  `trip_id` int(11) DEFAULT NULL,
  `vehicle_name` varchar(255) DEFAULT NULL,
  `rent_amount` decimal(10,2) DEFAULT NULL,
  `pickup_charge` decimal(10,2) DEFAULT NULL,
  `deposit` decimal(10,2) DEFAULT NULL,
  `advance_paid` decimal(10,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `vehicle_booking`
--

INSERT INTO `vehicle_booking` (`id`, `trip_id`, `vehicle_name`, `rent_amount`, `pickup_charge`, `deposit`, `advance_paid`) VALUES
(1, 1, 'Ertiga Manual', 6000.00, 500.00, 3000.00, 2000.00);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `booking_details`
--
ALTER TABLE `booking_details`
  ADD PRIMARY KEY (`id`),
  ADD KEY `trip_id` (`trip_id`);

--
-- Indexes for table `expenses`
--
ALTER TABLE `expenses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `trip_id` (`trip_id`),
  ADD KEY `paid_by` (`paid_by`);

--
-- Indexes for table `expense_splits`
--
ALTER TABLE `expense_splits`
  ADD PRIMARY KEY (`id`),
  ADD KEY `expense_id` (`expense_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `itinerary`
--
ALTER TABLE `itinerary`
  ADD PRIMARY KEY (`id`),
  ADD KEY `trip_id` (`trip_id`);

--
-- Indexes for table `payments`
--
ALTER TABLE `payments`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `train_details`
--
ALTER TABLE `train_details`
  ADD PRIMARY KEY (`id`),
  ADD KEY `trip_id` (`trip_id`);

--
-- Indexes for table `trips`
--
ALTER TABLE `trips`
  ADD PRIMARY KEY (`id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `trip_budget`
--
ALTER TABLE `trip_budget`
  ADD PRIMARY KEY (`id`),
  ADD KEY `trip_id` (`trip_id`);

--
-- Indexes for table `trip_members`
--
ALTER TABLE `trip_members`
  ADD PRIMARY KEY (`id`),
  ADD KEY `trip_id` (`trip_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `vehicle_booking`
--
ALTER TABLE `vehicle_booking`
  ADD PRIMARY KEY (`id`),
  ADD KEY `trip_id` (`trip_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `booking_details`
--
ALTER TABLE `booking_details`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `expenses`
--
ALTER TABLE `expenses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `expense_splits`
--
ALTER TABLE `expense_splits`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `itinerary`
--
ALTER TABLE `itinerary`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `payments`
--
ALTER TABLE `payments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `train_details`
--
ALTER TABLE `train_details`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `trips`
--
ALTER TABLE `trips`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `trip_budget`
--
ALTER TABLE `trip_budget`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `trip_members`
--
ALTER TABLE `trip_members`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `vehicle_booking`
--
ALTER TABLE `vehicle_booking`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `booking_details`
--
ALTER TABLE `booking_details`
  ADD CONSTRAINT `booking_details_ibfk_1` FOREIGN KEY (`trip_id`) REFERENCES `trips` (`id`);

--
-- Constraints for table `expenses`
--
ALTER TABLE `expenses`
  ADD CONSTRAINT `expenses_ibfk_1` FOREIGN KEY (`trip_id`) REFERENCES `trips` (`id`),
  ADD CONSTRAINT `expenses_ibfk_2` FOREIGN KEY (`paid_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `expense_splits`
--
ALTER TABLE `expense_splits`
  ADD CONSTRAINT `expense_splits_ibfk_1` FOREIGN KEY (`expense_id`) REFERENCES `expenses` (`id`),
  ADD CONSTRAINT `expense_splits_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `itinerary`
--
ALTER TABLE `itinerary`
  ADD CONSTRAINT `itinerary_ibfk_1` FOREIGN KEY (`trip_id`) REFERENCES `trips` (`id`);

--
-- Constraints for table `train_details`
--
ALTER TABLE `train_details`
  ADD CONSTRAINT `train_details_ibfk_1` FOREIGN KEY (`trip_id`) REFERENCES `trips` (`id`);

--
-- Constraints for table `trips`
--
ALTER TABLE `trips`
  ADD CONSTRAINT `trips_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `trip_budget`
--
ALTER TABLE `trip_budget`
  ADD CONSTRAINT `trip_budget_ibfk_1` FOREIGN KEY (`trip_id`) REFERENCES `trips` (`id`);

--
-- Constraints for table `trip_members`
--
ALTER TABLE `trip_members`
  ADD CONSTRAINT `trip_members_ibfk_1` FOREIGN KEY (`trip_id`) REFERENCES `trips` (`id`),
  ADD CONSTRAINT `trip_members_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `vehicle_booking`
--
ALTER TABLE `vehicle_booking`
  ADD CONSTRAINT `vehicle_booking_ibfk_1` FOREIGN KEY (`trip_id`) REFERENCES `trips` (`id`);
SET FOREIGN_KEY_CHECKS = 1;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;


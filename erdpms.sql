-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Mar 31, 2026 at 10:51 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `erdpms`
--

-- --------------------------------------------------------

--
-- Table structure for table `audit_log`
--

CREATE TABLE `audit_log` (
  `id` int(10) UNSIGNED NOT NULL,
  `admin_id` int(10) UNSIGNED NOT NULL,
  `action` varchar(50) NOT NULL,
  `target_id` int(10) UNSIGNED DEFAULT NULL,
  `details` text DEFAULT NULL,
  `ip_address` varchar(45) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `audit_log`
--

INSERT INTO `audit_log` (`id`, `admin_id`, `action`, `target_id`, `details`, `ip_address`, `created_at`) VALUES
(1, 2, 'update_user', 2, 'Updated user #2: name=Ivan Lee Almadrones, email=leeivanalmadrones6@gmail.com, role=admin', '::1', '2026-03-18 11:17:31');

-- --------------------------------------------------------

--
-- Table structure for table `departments`
--

CREATE TABLE `departments` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `supervisor_id` int(10) UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `departments`
--

INSERT INTO `departments` (`id`, `name`, `supervisor_id`, `created_at`) VALUES
(1, 'MIS', 3, '2026-03-18 18:43:45'),
(2, 'Marketing', 3, '2026-03-18 18:43:45'),
(3, 'Therapy', 3, '2026-03-18 18:43:45'),
(4, 'Human Resources', 3, '2026-03-18 18:43:45'),
(5, 'Accounting', 3, '2026-03-18 18:43:45'),
(6, 'Testing', 3, '2026-03-26 11:28:57');

-- --------------------------------------------------------

--
-- Table structure for table `tasks`
--

CREATE TABLE `tasks` (
  `id` int(10) UNSIGNED NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `created_by` int(10) UNSIGNED NOT NULL,
  `assigned_to` int(10) UNSIGNED NOT NULL,
  `department_id` int(10) UNSIGNED DEFAULT NULL,
  `start_date` date NOT NULL,
  `deadline` date NOT NULL,
  `status` enum('Ongoing','Completed','Overdue') NOT NULL DEFAULT 'Ongoing',
  `progress` tinyint(3) UNSIGNED NOT NULL DEFAULT 0,
  `priority` enum('Low','Medium','High') NOT NULL DEFAULT 'Medium',
  `remarks` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `completed_at` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tasks`
--

INSERT INTO `tasks` (`id`, `title`, `description`, `created_by`, `assigned_to`, `department_id`, `start_date`, `deadline`, `status`, `progress`, `priority`, `remarks`, `created_at`, `updated_at`, `completed_at`) VALUES
(4, 'Generate February Report', '', 14, 14, 3, '2026-03-25', '2026-03-26', 'Overdue', 0, 'High', NULL, '2026-03-24 15:46:32', '2026-03-28 09:43:07', NULL),
(6, 'Generate January Report', '', 17, 17, 1, '2027-03-17', '2028-03-15', 'Completed', 0, 'Low', NULL, '2026-03-24 15:52:03', '2026-03-28 14:22:42', NULL),
(7, 'Encoding Client Information', '', 14, 14, 3, '2026-03-25', '2026-03-26', 'Overdue', 0, 'Low', NULL, '2026-03-25 09:09:09', '2026-03-28 09:43:07', NULL),
(8, 'Test System Workflow', '', 25, 25, 4, '2026-03-23', '2026-03-24', 'Completed', 0, 'Low', NULL, '2026-03-25 09:37:42', '2026-03-26 11:17:02', NULL),
(12, 'Task 1', 'This is the description for task 1', 25, 25, 4, '2026-03-15', '2026-03-30', 'Completed', 0, 'Low', NULL, '2026-03-26 09:36:06', '2026-03-26 11:17:02', NULL),
(13, 'Task 2', 'This is the description for task 2', 29, 29, 6, '2026-03-15', '2026-03-27', 'Completed', 0, 'Medium', NULL, '2026-03-26 09:36:06', '2026-03-26 11:36:36', NULL),
(14, 'Task 3', 'This is the description for task 3', 29, 29, 6, '2026-03-15', '2026-03-29', 'Overdue', 0, 'High', NULL, '2026-03-26 09:36:06', '2026-03-26 11:36:42', NULL),
(15, 'Task 4', 'This is the description for task 4', 28, 28, 2, '2026-03-15', '2026-03-30', 'Completed', 0, 'Low', NULL, '2026-03-26 09:36:06', '2026-03-26 11:17:02', NULL),
(16, 'Task 5', 'This is the description for task 5', 26, 26, 5, '2026-03-15', '2026-03-18', 'Overdue', 0, 'Medium', NULL, '2026-03-26 09:36:06', '2026-03-28 09:43:07', NULL),
(17, 'Task 6', 'This is the description for task 6', 13, 13, 2, '2026-03-15', '2026-03-24', 'Completed', 0, 'Low', NULL, '2026-03-26 09:36:06', '2026-03-26 11:17:02', NULL),
(19, 'Task 8', 'This is the description for task 8', 27, 27, 1, '2026-03-15', '2026-03-25', 'Completed', 0, 'Low', NULL, '2026-03-26 09:36:06', '2026-03-26 11:17:02', NULL),
(20, 'Task 9', 'This is the description for task 9', 23, 23, 2, '2026-03-15', '2026-03-18', 'Overdue', 0, 'High', NULL, '2026-03-26 09:36:06', '2026-03-28 09:43:07', NULL),
(21, 'Task 10', 'This is the description for task 10', 23, 23, 2, '2026-03-15', '2026-03-23', 'Overdue', 0, 'Low', NULL, '2026-03-26 09:36:06', '2026-03-26 11:17:02', NULL),
(22, 'Task 11', 'This is the description for task 11', 23, 23, 2, '2026-03-15', '2026-03-20', 'Completed', 0, 'High', NULL, '2026-03-26 09:36:06', '2026-03-26 11:17:02', NULL),
(23, 'Task 12', 'This is the description for task 12', 18, 18, 2, '2026-03-15', '2026-03-26', 'Overdue', 0, 'Low', NULL, '2026-03-26 09:36:06', '2026-03-26 11:17:02', NULL),
(24, 'Task 13', 'This is the description for task 13', 29, 29, 6, '2026-03-15', '2026-03-29', 'Ongoing', 0, 'High', NULL, '2026-03-26 09:36:06', '2026-03-26 11:36:47', NULL),
(25, 'Task 14', 'This is the description for task 14', 31, 31, 5, '2026-03-15', '2026-03-21', 'Overdue', 0, 'Medium', NULL, '2026-03-26 09:36:06', '2026-03-26 11:17:02', NULL),
(26, 'Task 15', 'This is the description for task 15', 29, 29, 6, '2026-03-15', '2026-03-24', 'Overdue', 0, 'High', NULL, '2026-03-26 09:36:06', '2026-03-28 09:43:07', NULL),
(27, 'Task 16', 'This is the description for task 16', 21, 21, 5, '2026-03-15', '2026-03-16', 'Overdue', 0, 'Low', NULL, '2026-03-26 09:36:06', '2026-03-28 09:43:07', NULL),
(28, 'Task 17', 'This is the description for task 17', 31, 31, 5, '2026-03-15', '2026-03-24', 'Overdue', 0, 'Low', NULL, '2026-03-26 09:36:06', '2026-03-28 09:43:07', NULL),
(29, 'Task 18', 'This is the description for task 18', 18, 18, 2, '2026-03-15', '2026-03-25', 'Overdue', 0, 'Medium', NULL, '2026-03-26 09:36:06', '2026-03-28 09:43:07', NULL),
(30, 'Task 19', 'This is the description for task 19', 7, 7, 1, '2026-03-15', '2026-03-28', 'Overdue', 0, 'Low', NULL, '2026-03-26 09:36:06', '2026-03-28 09:43:07', NULL),
(31, 'Task 20', 'This is the description for task 20', 5, 5, 1, '2026-03-15', '2026-03-21', 'Completed', 0, 'High', NULL, '2026-03-26 09:36:06', '2026-03-26 11:17:02', NULL),
(32, 'Task 21', 'This is the description for task 21', 21, 21, 5, '2026-03-15', '2026-03-17', 'Overdue', 0, 'Low', NULL, '2026-03-26 09:36:06', '2026-03-28 09:43:07', NULL),
(33, 'Task 22', 'This is the description for task 22', 24, 24, 3, '2026-03-15', '2026-03-29', 'Ongoing', 0, 'High', NULL, '2026-03-26 09:36:06', '2026-03-26 11:17:02', NULL),
(34, 'Task 23', 'This is the description for task 23', 21, 21, 5, '2026-03-15', '2026-03-27', 'Overdue', 0, 'High', NULL, '2026-03-26 09:36:06', '2026-03-28 09:43:07', NULL),
(35, 'Task 24', 'This is the description for task 24', 30, 30, 4, '2026-03-15', '2026-03-17', 'Completed', 0, 'Medium', NULL, '2026-03-26 09:36:06', '2026-03-26 11:17:02', NULL),
(36, 'Task 25', 'This is the description for task 25', 13, 13, 2, '2026-03-15', '2026-03-21', 'Overdue', 0, 'High', NULL, '2026-03-26 09:36:06', '2026-03-26 11:17:02', NULL),
(37, 'Task 26', 'This is the description for task 26', 6, 6, 1, '2026-03-15', '2026-03-21', 'Completed', 0, 'High', NULL, '2026-03-26 09:36:06', '2026-03-28 13:18:41', '2026-03-28'),
(38, 'Task 27', 'This is the description for task 27', 26, 26, 5, '2026-03-15', '2026-03-18', 'Completed', 0, 'High', NULL, '2026-03-26 09:36:06', '2026-03-26 11:17:02', NULL),
(39, 'Task 28', 'This is the description for task 28', 18, 18, 2, '2026-03-15', '2026-03-20', 'Overdue', 0, 'Medium', NULL, '2026-03-26 09:36:06', '2026-03-28 09:43:07', NULL),
(40, 'Task 29', 'This is the description for task 29', 19, 19, 3, '2026-03-15', '2026-03-30', 'Overdue', 0, 'Medium', NULL, '2026-03-26 09:36:06', '2026-03-26 11:17:02', NULL),
(41, 'Task 30', 'This is the description for task 30', 24, 24, 3, '2026-03-15', '2026-03-21', 'Overdue', 0, 'High', NULL, '2026-03-26 09:36:06', '2026-03-26 11:17:02', NULL),
(42, 'Task 31', 'This is the description for task 31', 20, 20, 4, '2026-03-15', '2026-03-28', 'Overdue', 0, 'Low', NULL, '2026-03-26 09:36:06', '2026-03-26 11:17:02', NULL),
(43, 'Task 32', 'This is the description for task 32', 30, 30, 4, '2026-03-15', '2026-03-26', 'Completed', 0, 'Low', NULL, '2026-03-26 09:36:06', '2026-03-26 11:17:02', NULL),
(44, 'Task 33', 'This is the description for task 33', 20, 20, 4, '2026-03-15', '2026-03-29', 'Overdue', 0, 'Medium', NULL, '2026-03-26 09:36:06', '2026-03-26 11:17:02', NULL),
(45, 'Task 34', 'This is the description for task 34', 7, 7, 1, '2026-03-15', '2026-03-20', 'Overdue', 0, 'High', NULL, '2026-03-26 09:36:06', '2026-03-28 09:43:07', NULL),
(46, 'Task 35', 'This is the description for task 35', 7, 7, 1, '2026-03-15', '2026-03-26', 'Completed', 0, 'High', NULL, '2026-03-26 09:36:06', '2026-03-26 11:17:02', NULL),
(47, 'Task 36', 'This is the description for task 36', 6, 6, 1, '2026-03-15', '2026-03-24', 'Overdue', 0, 'Medium', NULL, '2026-03-26 09:36:06', '2026-03-28 09:48:07', NULL),
(48, 'Task 37', 'This is the description for task 37', 2, 2, 2, '2026-03-15', '2026-03-23', 'Overdue', 0, 'Low', NULL, '2026-03-26 09:36:06', '2026-03-28 09:43:07', NULL),
(49, 'Task 38', 'This is the description for task 38', 21, 21, 5, '2026-03-15', '2026-03-29', 'Completed', 0, 'Low', NULL, '2026-03-26 09:36:06', '2026-03-26 11:17:02', NULL),
(50, 'Task 39', 'This is the description for task 39', 13, 13, 2, '2026-03-15', '2026-03-19', 'Overdue', 0, 'High', NULL, '2026-03-26 09:36:06', '2026-03-26 11:17:02', NULL),
(51, 'Task 40', 'This is the description for task 40', 28, 28, 2, '2026-03-15', '2026-03-17', 'Overdue', 0, 'Low', NULL, '2026-03-26 09:36:06', '2026-03-26 11:17:02', NULL),
(52, 'Task 41', 'This is the description for task 41', 21, 21, 5, '2026-03-15', '2026-03-18', 'Overdue', 0, 'Low', NULL, '2026-03-26 09:36:06', '2026-03-26 11:17:02', NULL),
(53, 'Task 42', 'This is the description for task 42', 15, 15, 4, '2026-03-15', '2026-03-28', 'Completed', 0, 'High', NULL, '2026-03-26 09:36:06', '2026-03-26 11:17:02', NULL),
(54, 'Task 43', 'This is the description for task 43', 13, 13, 2, '2026-03-15', '2026-03-30', 'Ongoing', 0, 'High', NULL, '2026-03-26 09:36:06', '2026-03-26 11:17:02', NULL),
(55, 'Task 44', 'This is the description for task 44', 31, 31, 5, '2026-03-15', '2026-03-22', 'Overdue', 0, 'Medium', NULL, '2026-03-26 09:36:06', '2026-03-28 09:43:07', NULL),
(56, 'Task 45', 'This is the description for task 45', 5, 5, 1, '2026-03-15', '2026-03-19', 'Overdue', 0, 'High', NULL, '2026-03-26 09:36:06', '2026-03-28 09:43:07', NULL),
(57, 'Task 46', 'This is the description for task 46', 18, 18, 2, '2026-03-15', '2026-03-29', 'Ongoing', 0, 'Medium', NULL, '2026-03-26 09:36:06', '2026-03-26 11:17:02', NULL),
(58, 'Task 47', 'This is the description for task 47', 21, 21, 5, '2026-03-15', '2026-03-22', 'Overdue', 0, 'Low', NULL, '2026-03-26 09:36:06', '2026-03-28 09:43:07', NULL),
(59, 'Task 48', 'This is the description for task 48', 20, 20, 4, '2026-03-15', '2026-03-20', 'Overdue', 0, 'High', NULL, '2026-03-26 09:36:06', '2026-03-28 09:43:07', NULL),
(60, 'Task 49', 'This is the description for task 49', 22, 22, 1, '2026-03-15', '2026-03-18', 'Overdue', 0, 'Medium', NULL, '2026-03-26 09:36:06', '2026-03-26 11:17:02', NULL),
(61, 'Task 50', 'This is the description for task 50', 26, 26, 5, '2026-03-15', '2026-03-27', 'Overdue', 0, 'Low', NULL, '2026-03-26 09:36:06', '2026-03-26 11:17:02', NULL),
(75, 'Cezar Task', '', 3, 3, 1, '2026-03-26', '2026-03-28', 'Overdue', 0, 'Low', NULL, '2026-03-26 11:22:13', '2026-03-28 09:43:07', NULL),
(76, 'Testing', '', 4, 4, 1, '2026-03-26', '2026-03-28', 'Overdue', 0, 'Low', NULL, '2026-03-27 08:11:28', '2026-03-28 09:43:07', NULL),
(78, 'Testing 2', '', 4, 4, 1, '2026-03-17', '2026-03-20', 'Overdue', 0, 'Low', NULL, '2026-03-27 08:17:13', '2026-03-27 08:17:13', NULL),
(79, 'Testing 3', '', 4, 4, 1, '2026-03-28', '2026-03-31', 'Ongoing', 0, 'Low', NULL, '2026-03-27 08:19:19', '2026-03-27 08:19:19', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','supervisor','staff','executive') NOT NULL DEFAULT 'staff',
  `contact` int(11) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `department` varchar(100) DEFAULT NULL,
  `department_id` int(10) UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `password`, `role`, `contact`, `address`, `is_active`, `department`, `department_id`, `created_at`, `updated_at`) VALUES
(2, 'Ivan Lee Almadrones', 'leeivanalmadrones6@gmail.com', '$2y$10$ThvlURun.5KccFcz/iFrNuL2fKc41cbLoskeQL3f9OdHNaXXpRToi', 'staff', NULL, NULL, 1, '1', 2, '2026-03-18 09:49:21', '2026-03-25 16:32:51'),
(3, 'Cezar Bernandino', 'bernandinocezar@gmail.com', '$2y$10$J0LBGNn/sKSF4y5lLobtJ.DKCdSxDu9I5dDqoK08CwxfAD1dDW5x2', 'supervisor', NULL, NULL, 1, '1', 1, '2026-03-20 09:25:02', '2026-03-25 13:16:10'),
(4, 'Zar Bernardo', 'bernardozar@gmail.com', '$2y$10$J0LBGNn/sKSF4y5lLobtJ.DKCdSxDu9I5dDqoK08CwxfAD1dDW5x2', 'staff', 987654321, 'P3 Lugui', 1, NULL, 1, '2026-03-25 13:18:00', '2026-03-27 15:47:27'),
(5, 'Justin Marigal', 'madrigaljustin@gmail.com', '$2y$10$J0LBGNn/sKSF4y5lLobtJ.DKCdSxDu9I5dDqoK08CwxfAD1dDW5x2', 'staff', NULL, NULL, 1, NULL, 1, '2026-03-25 13:20:52', '2026-03-25 13:20:52'),
(6, 'Samantha Velasquez', 'velasquezsamantha@gmail.com', '$2y$10$J0LBGNn/sKSF4y5lLobtJ.DKCdSxDu9I5dDqoK08CwxfAD1dDW5x2', 'staff', NULL, NULL, 1, NULL, 1, '2026-03-25 13:22:29', '2026-03-25 13:22:29'),
(7, 'Juan Dela Cruz', 'juan.delacruz1@example.com', '$2y$10$J0LBGNn/sKSF4y5lLobtJ.DKCdSxDu9I5dDqoK08CwxfAD1dDW5x2', 'staff', NULL, NULL, 1, NULL, 1, '2026-03-25 19:35:43', '2026-03-25 19:35:43'),
(8, 'Maria Santos', 'maria.santos2@example.com', '$2y$10$J0LBGNn/sKSF4y5lLobtJ.DKCdSxDu9I5dDqoK08CwxfAD1dDW5x2', 'supervisor', NULL, NULL, 1, NULL, 2, '2026-03-25 19:35:43', '2026-03-26 09:09:19'),
(9, 'Joseph Rizal', 'joseph.rizal3@example.com', '$2y$10$J0LBGNn/sKSF4y5lLobtJ.DKCdSxDu9I5dDqoK08CwxfAD1dDW5x2', 'supervisor', NULL, NULL, 1, NULL, 3, '2026-03-25 19:35:43', '2026-03-26 09:10:12'),
(10, 'Ana Lim', 'ana.lim4@example.com', '$2y$10$J0LBGNn/sKSF4y5lLobtJ.DKCdSxDu9I5dDqoK08CwxfAD1dDW5x2', 'supervisor', NULL, NULL, 1, NULL, 4, '2026-03-25 19:35:43', '2026-03-26 09:10:38'),
(11, 'Pedro Gonzalez', 'pedro.gonzalez5@example.com', '$2y$10$J0LBGNn/sKSF4y5lLobtJ.DKCdSxDu9I5dDqoK08CwxfAD1dDW5x2', 'supervisor', NULL, NULL, 1, NULL, 5, '2026-03-25 19:35:43', '2026-03-26 09:11:04'),
(12, 'Catherine Reyes', 'catherine.reyes6@example.com', '$2y$10$J0LBGNn/sKSF4y5lLobtJ.DKCdSxDu9I5dDqoK08CwxfAD1dDW5x2', 'staff', NULL, NULL, 1, NULL, 1, '2026-03-25 19:35:43', '2026-03-25 19:35:43'),
(13, 'Mark Villanueva', 'mark.villanueva7@example.com', '$2y$10$J0LBGNn/sKSF4y5lLobtJ.DKCdSxDu9I5dDqoK08CwxfAD1dDW5x2', 'staff', NULL, NULL, 1, NULL, 2, '2026-03-25 19:35:43', '2026-03-25 19:35:43'),
(14, 'Kristine Cruz', 'kristine.cruz8@example.com', '$2y$10$J0LBGNn/sKSF4y5lLobtJ.DKCdSxDu9I5dDqoK08CwxfAD1dDW5x2', 'staff', NULL, NULL, 1, NULL, 3, '2026-03-25 19:35:43', '2026-03-25 19:35:43'),
(15, 'Luis Mendoza', 'luis.mendoza9@example.com', '$2y$10$J0LBGNn/sKSF4y5lLobtJ.DKCdSxDu9I5dDqoK08CwxfAD1dDW5x2', 'staff', NULL, NULL, 1, NULL, 4, '2026-03-25 19:35:43', '2026-03-25 19:35:43'),
(16, 'Grace Aquino', 'grace.aquino10@example.com', '$2y$10$J0LBGNn/sKSF4y5lLobtJ.DKCdSxDu9I5dDqoK08CwxfAD1dDW5x2', 'staff', NULL, NULL, 1, NULL, 5, '2026-03-25 19:35:43', '2026-03-25 19:35:43'),
(17, 'Ramon Bautista', 'ramon.bautista11@example.com', '$2y$10$J0LBGNn/sKSF4y5lLobtJ.DKCdSxDu9I5dDqoK08CwxfAD1dDW5x2', 'staff', NULL, NULL, 1, NULL, 1, '2026-03-25 19:35:43', '2026-03-25 19:35:43'),
(18, 'Jessica Tan', 'jessica.tan12@example.com', '$2y$10$J0LBGNn/sKSF4y5lLobtJ.DKCdSxDu9I5dDqoK08CwxfAD1dDW5x2', 'staff', NULL, NULL, 1, NULL, 2, '2026-03-25 19:35:43', '2026-03-25 19:35:43'),
(19, 'Miguel Santos', 'miguel.santos13@example.com', '$2y$10$J0LBGNn/sKSF4y5lLobtJ.DKCdSxDu9I5dDqoK08CwxfAD1dDW5x2', 'staff', NULL, NULL, 1, NULL, 3, '2026-03-25 19:35:43', '2026-03-25 19:35:43'),
(20, 'Liza dela Rosa', 'liza.delarosa14@example.com', '$2y$10$J0LBGNn/sKSF4y5lLobtJ.DKCdSxDu9I5dDqoK08CwxfAD1dDW5x2', 'staff', NULL, NULL, 1, NULL, 4, '2026-03-25 19:35:43', '2026-03-25 19:35:43'),
(21, 'Arnel Gonzales', 'arnel.gonzales15@example.com', '$2y$10$J0LBGNn/sKSF4y5lLobtJ.DKCdSxDu9I5dDqoK08CwxfAD1dDW5x2', 'staff', NULL, NULL, 1, NULL, 5, '2026-03-25 19:35:43', '2026-03-25 19:35:43'),
(22, 'Melanie Cruz', 'melanie.cruz16@example.com', '$2y$10$J0LBGNn/sKSF4y5lLobtJ.DKCdSxDu9I5dDqoK08CwxfAD1dDW5x2', 'staff', NULL, NULL, 1, NULL, 1, '2026-03-25 19:35:43', '2026-03-25 19:35:43'),
(23, 'Anthony Ramos', 'anthony.ramos17@example.com', '$2y$10$J0LBGNn/sKSF4y5lLobtJ.DKCdSxDu9I5dDqoK08CwxfAD1dDW5x2', 'staff', NULL, NULL, 1, NULL, 2, '2026-03-25 19:35:43', '2026-03-25 19:35:43'),
(24, 'Carla Navarro', 'carla.navarro18@example.com', '$2y$10$J0LBGNn/sKSF4y5lLobtJ.DKCdSxDu9I5dDqoK08CwxfAD1dDW5x2', 'staff', NULL, NULL, 1, NULL, 3, '2026-03-25 19:35:43', '2026-03-25 19:35:43'),
(25, 'Rafael Lim', 'rafael.lim19@example.com', '$2y$10$J0LBGNn/sKSF4y5lLobtJ.DKCdSxDu9I5dDqoK08CwxfAD1dDW5x2', 'staff', NULL, NULL, 1, NULL, 4, '2026-03-25 19:35:43', '2026-03-25 19:35:43'),
(26, 'Elaine Fernandez', 'elaine.fernandez20@example.com', '$2y$10$J0LBGNn/sKSF4y5lLobtJ.DKCdSxDu9I5dDqoK08CwxfAD1dDW5x2', 'executive', NULL, NULL, 1, NULL, 5, '2026-03-25 19:35:43', '2026-03-31 16:46:57'),
(27, 'Dennis Tan', 'dennis.tan21@example.com', '$2y$10$J0LBGNn/sKSF4y5lLobtJ.DKCdSxDu9I5dDqoK08CwxfAD1dDW5x2', 'staff', NULL, NULL, 1, NULL, 1, '2026-03-25 19:35:43', '2026-03-25 19:35:43'),
(28, 'Sophia Reyes', 'sophia.reyes22@example.com', '$2y$10$J0LBGNn/sKSF4y5lLobtJ.DKCdSxDu9I5dDqoK08CwxfAD1dDW5x2', 'staff', NULL, NULL, 1, NULL, 2, '2026-03-25 19:35:43', '2026-03-25 19:35:43'),
(29, 'Victor Mendoza', 'victor.mendoza23@example.com', '$2y$10$J0LBGNn/sKSF4y5lLobtJ.DKCdSxDu9I5dDqoK08CwxfAD1dDW5x2', 'staff', NULL, NULL, 1, NULL, 6, '2026-03-25 19:35:43', '2026-03-26 11:35:49'),
(30, 'Angela Santos', 'angela.santos24@example.com', '$2y$10$J0LBGNn/sKSF4y5lLobtJ.DKCdSxDu9I5dDqoK08CwxfAD1dDW5x2', 'staff', NULL, NULL, 1, NULL, 4, '2026-03-25 19:35:43', '2026-03-25 19:35:43'),
(31, 'Johan dela Cruz', 'johan.delacruz25@example.com', '$2y$10$J0LBGNn/sKSF4y5lLobtJ.DKCdSxDu9I5dDqoK08CwxfAD1dDW5x2', 'staff', NULL, NULL, 1, NULL, 5, '2026-03-25 19:35:43', '2026-03-25 19:35:43'),
(32, 'Razec Bernandino', 'cezarbernandino12@gmail.com', '$2y$10$V0J5nhn8i6rHF.JZfTpzSO4QTsSMUhcUTVKcNexpIHc13XYxBUNqW', 'staff', 2147483647, '98780-', 1, NULL, 1, '2026-03-27 15:56:29', '2026-03-27 15:56:29');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `audit_log`
--
ALTER TABLE `audit_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_admin` (`admin_id`),
  ADD KEY `idx_action` (`action`),
  ADD KEY `idx_target` (`target_id`),
  ADD KEY `idx_created` (`created_at`);

--
-- Indexes for table `departments`
--
ALTER TABLE `departments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`),
  ADD KEY `idx_name` (`name`),
  ADD KEY `fk_departments_supervisor` (`supervisor_id`);

--
-- Indexes for table `tasks`
--
ALTER TABLE `tasks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_tasks_assigned` (`assigned_to`),
  ADD KEY `fk_tasks_department` (`department_id`),
  ADD KEY `fk_tasks_creator` (`created_by`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_role` (`role`),
  ADD KEY `idx_active` (`is_active`),
  ADD KEY `idx_department_id` (`department_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `audit_log`
--
ALTER TABLE `audit_log`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `departments`
--
ALTER TABLE `departments`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `tasks`
--
ALTER TABLE `tasks`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=80;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=33;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `audit_log`
--
ALTER TABLE `audit_log`
  ADD CONSTRAINT `audit_log_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `audit_log_ibfk_2` FOREIGN KEY (`target_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `departments`
--
ALTER TABLE `departments`
  ADD CONSTRAINT `fk_departments_supervisor` FOREIGN KEY (`supervisor_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `tasks`
--
ALTER TABLE `tasks`
  ADD CONSTRAINT `fk_tasks_assigned` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_tasks_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_tasks_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `fk_users_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

DELIMITER $$
--
-- Events
--
CREATE DEFINER=`root`@`localhost` EVENT `update_overdue_tasks` ON SCHEDULE EVERY 5 MINUTE STARTS '2026-03-28 09:43:07' ON COMPLETION NOT PRESERVE ENABLE DO UPDATE tasks
  SET status = 'Overdue'
  WHERE deadline < NOW()
    AND status != 'Completed'$$

DELIMITER ;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

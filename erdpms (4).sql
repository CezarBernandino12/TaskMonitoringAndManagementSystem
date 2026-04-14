-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Apr 13, 2026 at 09:38 AM
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
-- Table structure for table `events`
--

CREATE TABLE `events` (
  `id` int(10) UNSIGNED NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `status` enum('Upcoming','Ongoing','Completed','Cancelled') NOT NULL DEFAULT 'Upcoming',
  `priority` enum('High','Medium','Low') NOT NULL DEFAULT 'Medium',
  `created_by` int(10) UNSIGNED NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `events`
--

INSERT INTO `events` (`id`, `title`, `description`, `location`, `start_date`, `end_date`, `status`, `priority`, `created_by`, `created_at`, `updated_at`) VALUES
(11, 'Psychological Assessment', 'Assessment for BSP Employeex', 'BSP Baguio, City', '2026-04-06', '2026-04-06', 'Upcoming', 'Medium', 13, '2026-04-02 15:10:15', '2026-04-02 15:10:15'),
(14, 'CEZAR', 'cezar', 'LABO', '2026-05-01', '2026-05-08', 'Upcoming', 'Medium', 3, '2026-04-04 13:35:01', '2026-04-04 13:35:01'),
(15, 'TESTING', 'testing', 'testing', '2026-05-01', '2026-05-08', 'Upcoming', 'Medium', 3, '2026-04-04 13:35:51', '2026-04-04 13:35:51'),
(16, 'Psychological Evaluation', 'testing', 'testing', '2026-04-04', '2026-04-04', 'Ongoing', 'Medium', 3, '2026-04-04 13:36:37', '2026-04-06 15:47:38'),
(18, 'Psychological Evaluation', 'For PMMA', 'PMMA Pasig City', '2026-04-06', '2026-04-06', 'Ongoing', 'Medium', 13, '2026-04-06 15:49:40', '2026-04-06 15:49:40'),
(19, 'Team Building', 'Team Building', 'Team Building', '2026-04-10', '2026-04-10', 'Upcoming', 'Medium', 13, '2026-04-06 16:03:35', '2026-04-06 16:03:35'),
(20, 'test only', 'test only', 'test only', '2026-04-07', '2026-04-07', 'Upcoming', 'Medium', 11, '2026-04-07 13:20:01', '2026-04-07 13:20:10'),
(21, 'Testing', 'Testing', 'Testing', '2026-04-07', '2026-04-07', 'Upcoming', 'Medium', 15, '2026-04-07 13:33:46', '2026-04-07 13:33:46');

-- --------------------------------------------------------

--
-- Table structure for table `event_employees`
--

CREATE TABLE `event_employees` (
  `event_id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `event_employees`
--

INSERT INTO `event_employees` (`event_id`, `user_id`) VALUES
(11, 21),
(11, 26),
(11, 31),
(14, 4),
(14, 34),
(14, 35),
(19, 2),
(19, 4),
(19, 5),
(19, 6),
(19, 7),
(19, 12),
(19, 13),
(19, 14),
(19, 15),
(19, 16),
(19, 17),
(19, 18),
(19, 19),
(19, 20),
(19, 21),
(19, 22),
(19, 23),
(19, 24),
(19, 25),
(19, 26),
(19, 27),
(19, 28),
(19, 29),
(19, 30),
(19, 31),
(19, 32),
(19, 34),
(19, 35),
(20, 26),
(20, 35),
(21, 2),
(21, 4),
(21, 5),
(21, 6),
(21, 7),
(21, 12),
(21, 13),
(21, 14),
(21, 15),
(21, 16),
(21, 17),
(21, 18),
(21, 19),
(21, 20),
(21, 21),
(21, 22),
(21, 23),
(21, 24),
(21, 25),
(21, 26),
(21, 27),
(21, 28),
(21, 29),
(21, 30),
(21, 31),
(21, 32),
(21, 34),
(21, 35);

-- --------------------------------------------------------

--
-- Table structure for table `messages`
--

CREATE TABLE `messages` (
  `id` int(10) UNSIGNED NOT NULL,
  `message` text NOT NULL,
  `task_id` int(10) UNSIGNED DEFAULT NULL,
  `sender_id` int(10) UNSIGNED NOT NULL,
  `recipient_id` int(10) UNSIGNED NOT NULL,
  `time_sent` datetime NOT NULL DEFAULT current_timestamp(),
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `read_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `messages`
--

INSERT INTO `messages` (`id`, `message`, `task_id`, `sender_id`, `recipient_id`, `time_sent`, `is_read`, `read_at`) VALUES
(1, 'hi', 55, 37, 31, '2026-04-07 21:55:40', 1, '2026-04-09 17:07:00'),
(2, 'do this', 55, 37, 31, '2026-04-07 21:56:27', 1, '2026-04-09 17:07:00'),
(3, 'hi', 41, 37, 24, '2026-04-07 22:09:23', 0, NULL),
(4, 'do this', 41, 37, 24, '2026-04-07 22:09:33', 0, NULL),
(5, 'hi', 50, 37, 13, '2026-04-07 22:10:12', 0, NULL),
(6, 'do this', 50, 37, 13, '2026-04-07 22:10:24', 0, NULL),
(7, 'hi', 39, 37, 18, '2026-04-07 22:12:17', 0, NULL),
(8, 'do this', 39, 37, 18, '2026-04-07 22:12:25', 0, NULL),
(9, 'hi', 80, 37, 4, '2026-04-07 22:13:59', 1, '2026-04-09 16:44:26'),
(10, 'do this', 80, 37, 4, '2026-04-07 22:14:06', 1, '2026-04-09 16:44:26'),
(11, 'DO THIS ASAP', 56, 37, 5, '2026-04-09 10:50:54', 1, '2026-04-09 11:27:53'),
(12, '', 56, 37, 5, '2026-04-09 10:51:07', 1, '2026-04-09 11:27:53'),
(13, 'do this asap', 56, 37, 5, '2026-04-09 10:51:22', 1, '2026-04-09 11:27:53'),
(14, 'hello', NULL, 37, 13, '2026-04-09 14:34:36', 0, NULL),
(15, 'ok', NULL, 5, 37, '2026-04-09 14:49:51', 1, '2026-04-09 14:50:19'),
(16, 'ok', NULL, 37, 5, '2026-04-09 14:56:45', 1, '2026-04-09 14:56:58'),
(17, 'ok', NULL, 5, 37, '2026-04-09 15:24:09', 1, '2026-04-09 15:27:12'),
(18, 'ok', NULL, 5, 37, '2026-04-09 15:26:51', 1, '2026-04-09 15:27:12'),
(19, 'on it sir', NULL, 4, 37, '2026-04-09 16:44:43', 1, '2026-04-09 16:45:46'),
(20, 'Please do this ASAP. Use this file as reference', 28, 37, 31, '2026-04-09 17:04:26', 1, '2026-04-09 17:07:00'),
(21, 'on it sir', NULL, 31, 37, '2026-04-09 17:07:11', 0, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `message_attachments`
--

CREATE TABLE `message_attachments` (
  `id` int(10) UNSIGNED NOT NULL,
  `message_id` int(10) UNSIGNED NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `uploaded_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `message_attachments`
--

INSERT INTO `message_attachments` (`id`, `message_id`, `file_name`, `file_path`, `uploaded_at`) VALUES
(1, 2, 'calendar.jsx', 'uploads/task_messages/msg_69d50d0b76be27.80238840.jsx', '2026-04-07 21:56:27'),
(2, 4, 'calendar.jsx', 'uploads/task_messages/msg_69d5101da14137.36795929.jsx', '2026-04-07 22:09:33'),
(3, 6, 'dailyy.jsx', 'uploads/task_messages/msg_69d5105033f114.54871214.jsx', '2026-04-07 22:10:24'),
(4, 8, 'monthly.jsx', 'uploads/task_messages/msg_69d510c9935939.58385712.jsx', '2026-04-07 22:12:25'),
(5, 10, 'daily.jsx', 'uploads/task_messages/msg_69d5112e848e84.13193293.jsx', '2026-04-07 22:14:06'),
(6, 20, 'Wk5 - Bernandino.docx', 'uploads/task_messages/msg_69d76b9a6c15d4.56475589.docx', '2026-04-09 17:04:26');

-- --------------------------------------------------------

--
-- Table structure for table `strategic_plans`
--

CREATE TABLE `strategic_plans` (
  `id` int(10) UNSIGNED NOT NULL,
  `plan_title` varchar(255) NOT NULL,
  `department` varchar(255) NOT NULL,
  `vision` text NOT NULL,
  `mission` text NOT NULL,
  `prepared_by` varchar(255) NOT NULL,
  `prepared_by_title` varchar(255) DEFAULT NULL,
  `noted_by_exec_dir` varchar(255) NOT NULL,
  `noted_by_president` varchar(255) NOT NULL,
  `created_by` int(10) UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `strategic_plans`
--

INSERT INTO `strategic_plans` (`id`, `plan_title`, `department`, `vision`, `mission`, `prepared_by`, `prepared_by_title`, `noted_by_exec_dir`, `noted_by_president`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 'Strategic Plan 2026', 'Management Information System', 'To drive company-wide innovation and efficiency through integrated digital systems, data-driven decision-making, and sustainable technology solutions. AND TEST', 'To develop and maintain efficient, secure, and intelligent MIS processes and systems that optimize resources, support operations, and improve productivity across all departments. AND TEST', 'Albert R. Limpin', 'M.I.S Coordinator', '', '', NULL, '2026-04-13 10:44:04', '2026-04-13 10:44:04'),
(2, 'Strategic Plan 2026', 'Management Information System', 'To drive company-wide innovation and efficiency through integrated digital systems, data-driven decision-making, and sustainable technology solutions.', 'To develop and maintain efficient, secure, and intelligent MIS processes and systems that optimize resources, support operations, and improve productivity across all departments.', 'Albert R. Limpin', 'M.I.S Coordinator', '', '', NULL, '2026-04-13 11:50:50', '2026-04-13 11:50:50'),
(3, 'TEST', 'TEST', 'TEST', 'TEST', 'Maria Santos', 'TEST', '', '', NULL, '2026-04-13 14:14:25', '2026-04-13 14:14:25'),
(4, 'TEST ONLY', 'Marketing', 'TEST ONLY', 'TEST ONLY', 'Maria Santos', 'Supervisor', 'Mark Martin', 'TEST ONLY', NULL, '2026-04-13 15:11:59', '2026-04-13 15:11:59');

-- --------------------------------------------------------

--
-- Table structure for table `strategic_plan_goals`
--

CREATE TABLE `strategic_plan_goals` (
  `id` int(10) UNSIGNED NOT NULL,
  `plan_id` int(10) UNSIGNED NOT NULL,
  `sort_order` smallint(5) UNSIGNED NOT NULL DEFAULT 0,
  `goal` varchar(500) NOT NULL,
  `objectives` text DEFAULT NULL,
  `plans` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`plans`)),
  `timeline` varchar(500) DEFAULT NULL,
  `personnel` text DEFAULT NULL,
  `metric` text DEFAULT NULL,
  `remarks` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `strategic_plan_goals`
--

INSERT INTO `strategic_plan_goals` (`id`, `plan_id`, `sort_order`, `goal`, `objectives`, `plans`, `timeline`, `personnel`, `metric`, `remarks`) VALUES
(1, 1, 0, 'Improve the Procurement System  AND TEST', 'Establish a clear, efficient, and well-monitored process for company purchases.\nHelp ensure all purchase requests are properly tracked, processed, and documented.  AND TEST', '[\"Review and improve the procurement workflow  AND TEST\",\"Oversee development of a purchase tracking system  AND TEST\",\"Report any issues or delays to the I.T. Supervisor  AND TEST\"]', 'March 15, 2026', 'Mr. A. Limpin\nMr. K.J Adonis', '30% faster purchasing process with fewer delays.\n100% of procurement entries accurate and up to date.', 'Purchasing/Inventory Done'),
(2, 1, 1, 'AND TEST', 'AND TEST', '[\"AND TEST\"]', 'AND TEST', 'AND TEST', 'AND TEST', 'AND TEST'),
(3, 2, 0, 'Improve the Procurement System sssssss', 'Establish a clear, efficient, and well-monitored process for company purchases.\nHelp ensure all purchase requests are properly tracked, processed, and documented. sssssss', '[\"Review and improve the procurement workflow sssssss\",\"Oversee development of a purchase tracking system sssssss\",\"Report any issues or delays to the I.T. Supervisor sssssss\",\"sssssss\"]', 'March 15, 2026 sssssss', 'Mr. A. LimpinMr. K.J Adonis sssssss', '30% faster purchasing process with fewer delays.\n100% of procurement entries accurate and up to date.', 'Purchasing/Inventory Done sssssss'),
(4, 2, 1, 'sssssss', 'sssssss', '[\"sssssss\",\"sssssss\",\"sssssss\"]', 'sssssss', 'sssssss', 'sssssss', 'sssssss'),
(5, 3, 0, 'Improve the Procurement System', '1.	Establish a clear, efficient, and well-monitored process for company purchases.\n2.	Help ensure all purchase requests are properly tracked, processed, and documented.', '[\"1.\\tReview and improve the procurement workflowr\",\"2.\\tOversee development of a purchase tracking system\",\"3.\\t Report any issues or delays to the I.T. Superviso\",\"test\"]', 'End of March', 'Anthony Ramos\nMaria Santos', '30%', 'Ongoing'),
(6, 3, 1, 'TEST', 'TEST', '[\"TEST\",\"TEST\"]', 'TEST', 'Maria Santos', 'TEST', 'TEST'),
(7, 4, 0, 'TEST ONLY', 'TEST ONLY', '[\"TEST ONLY\",\"TEST ONLY\",\"TEST ONLY\"]', 'TEST ONLY', 'Maria Santos\nAnthony Ramos', 'TEST ONLY', 'TEST ONLY'),
(8, 4, 1, 'TEST ONLY', 'TEST ONLY\nTEST ONLY\nTEST ONLY', '[\"TEST ONLY\",\"TEST ONLY\",\"TEST ONLY\"]', 'TEST ONLY', 'Maria Santos', 'TEST ONLY', 'TEST ONLY');

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
  `progress_percentage` tinyint(3) UNSIGNED NOT NULL DEFAULT 0,
  `remarks` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `completed_at` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tasks`
--

INSERT INTO `tasks` (`id`, `title`, `description`, `created_by`, `assigned_to`, `department_id`, `start_date`, `deadline`, `status`, `progress`, `priority`, `progress_percentage`, `remarks`, `created_at`, `updated_at`, `completed_at`) VALUES
(4, 'Generate February Report', '', 14, 14, 3, '2026-03-25', '2026-03-26', 'Overdue', 0, 'High', 0, NULL, '2026-03-24 15:46:32', '2026-03-28 09:43:07', NULL),
(6, 'Generate January Report', '', 17, 17, 1, '2027-03-17', '2028-03-15', 'Completed', 0, 'Low', 0, NULL, '2026-03-24 15:52:03', '2026-03-28 14:22:42', NULL),
(7, 'Encoding Client Information', '', 14, 14, 3, '2026-03-25', '2026-03-26', 'Completed', 0, 'Low', 0, NULL, '2026-03-25 09:09:09', '2026-04-01 15:23:37', '2026-04-01'),
(8, 'Test System Workflow', '', 25, 25, 4, '2026-03-23', '2026-03-24', 'Completed', 0, 'Low', 0, NULL, '2026-03-25 09:37:42', '2026-03-26 11:17:02', NULL),
(12, 'Task 1', 'This is the description for task 1', 25, 25, 4, '2026-03-15', '2026-03-30', 'Completed', 0, 'Low', 0, NULL, '2026-03-26 09:36:06', '2026-04-01 14:58:50', '2026-04-01'),
(13, 'Task 2', 'This is the description for task 2', 29, 29, 6, '2026-03-15', '2026-03-27', 'Completed', 0, 'Medium', 0, NULL, '2026-03-26 09:36:06', '2026-04-01 14:58:43', '2026-04-01'),
(14, 'Task 3', 'This is the description for task 3', 29, 29, 6, '2026-03-15', '2026-03-29', 'Overdue', 0, 'High', 0, NULL, '2026-03-26 09:36:06', '2026-03-26 11:36:42', NULL),
(15, 'Task 4', 'This is the description for task 4', 28, 28, 2, '2026-03-15', '2026-03-30', 'Completed', 0, 'Low', 0, NULL, '2026-03-26 09:36:06', '2026-04-01 14:58:33', '2026-04-01'),
(16, 'Task 5', 'This is the description for task 5', 26, 26, 5, '2026-03-15', '2026-03-18', 'Overdue', 0, 'Medium', 0, NULL, '2026-03-26 09:36:06', '2026-03-28 09:43:07', NULL),
(17, 'Task 6', 'This is the description for task 6', 13, 13, 2, '2026-03-15', '2026-03-24', 'Completed', 0, 'Low', 0, NULL, '2026-03-26 09:36:06', '2026-04-01 14:58:27', '2026-04-01'),
(19, 'Task 8', 'This is the description for task 8', 27, 27, 1, '2026-03-15', '2026-03-25', 'Completed', 0, 'Low', 0, NULL, '2026-03-26 09:36:06', '2026-04-01 14:58:18', '2026-04-01'),
(20, 'Task 9', 'This is the description for task 9', 23, 23, 2, '2026-03-15', '2026-03-18', 'Overdue', 0, 'High', 0, NULL, '2026-03-26 09:36:06', '2026-03-28 09:43:07', NULL),
(21, 'Task 10', 'This is the description for task 10', 23, 23, 2, '2026-03-15', '2026-03-23', 'Completed', 0, 'Low', 0, NULL, '2026-03-26 09:36:06', '2026-04-01 14:57:49', '2026-04-01'),
(22, 'Task 11', 'This is the description for task 11', 23, 23, 2, '2026-03-15', '2026-03-20', 'Completed', 0, 'High', 0, NULL, '2026-03-26 09:36:06', '2026-04-01 14:57:58', '2026-04-01'),
(23, 'Task 12', 'This is the description for task 12', 18, 18, 2, '2026-03-15', '2026-04-29', 'Ongoing', 0, 'Low', 0, NULL, '2026-03-26 09:36:06', '2026-04-01 14:57:16', NULL),
(24, 'Task 13', 'This is the description for task 13', 29, 29, 6, '2026-03-15', '2026-04-02', 'Ongoing', 0, 'High', 0, NULL, '2026-03-26 09:36:06', '2026-04-01 15:19:14', NULL),
(25, 'Task 14', 'This is the description for task 14', 31, 31, 5, '2026-03-15', '2026-04-04', 'Ongoing', 0, 'Medium', 0, NULL, '2026-03-26 09:36:06', '2026-04-01 15:20:09', NULL),
(26, 'Task 15', 'This is the description for task 15', 29, 29, 6, '2026-03-15', '2026-04-03', 'Ongoing', 0, 'High', 0, NULL, '2026-03-26 09:36:06', '2026-04-01 15:19:08', NULL),
(27, 'Task 16', 'This is the description for task 16', 21, 21, 5, '2026-03-15', '2026-03-16', 'Completed', 0, 'Low', 0, NULL, '2026-03-26 09:36:06', '2026-03-31 16:48:44', '2026-03-31'),
(28, 'Task 17', 'This is the description for task 17', 31, 31, 5, '2026-03-15', '2026-04-03', 'Ongoing', 0, 'Low', 0, NULL, '2026-03-26 09:36:06', '2026-04-01 15:20:49', NULL),
(29, 'Task 18', 'This is the description for task 18', 18, 18, 2, '2026-03-15', '2026-03-25', 'Completed', 0, 'Medium', 0, NULL, '2026-03-26 09:36:06', '2026-04-01 14:56:15', '2026-04-01'),
(30, 'Task 19', 'This is the description for task 19', 7, 7, 1, '2026-03-15', '2026-04-23', 'Ongoing', 0, 'Low', 0, NULL, '2026-03-26 09:36:06', '2026-04-01 14:55:48', NULL),
(31, 'Task 20', 'This is the description for task 20', 5, 5, 1, '2026-03-15', '2026-03-21', 'Completed', 0, 'High', 0, NULL, '2026-03-26 09:36:06', '2026-03-26 11:17:02', NULL),
(32, 'Task 21', 'This is the description for task 21', 21, 21, 5, '2026-03-15', '2026-03-17', 'Completed', 0, 'Low', 0, NULL, '2026-03-26 09:36:06', '2026-03-31 16:57:15', '2026-03-31'),
(33, 'Task 22', 'This is the description for task 22', 24, 24, 3, '2026-03-15', '2026-04-03', 'Ongoing', 0, 'High', 0, NULL, '2026-03-26 09:36:06', '2026-04-01 15:23:58', NULL),
(34, 'Task 23', 'This is the description for task 23', 21, 21, 5, '2026-03-15', '2026-04-03', 'Ongoing', 0, 'High', 0, NULL, '2026-03-26 09:36:06', '2026-04-01 15:20:03', NULL),
(35, 'Task 24', 'This is the description for task 24', 30, 30, 4, '2026-03-15', '2026-03-17', 'Completed', 0, 'Medium', 0, NULL, '2026-03-26 09:36:06', '2026-03-26 11:17:02', NULL),
(36, 'Task 25', 'This is the description for task 25', 13, 13, 2, '2026-03-15', '2026-03-21', 'Completed', 0, 'High', 0, NULL, '2026-03-26 09:36:06', '2026-04-06 08:29:36', '2026-04-06'),
(37, 'Task 26', 'This is the description for task 26', 6, 6, 1, '2026-03-15', '2026-03-21', 'Completed', 0, 'High', 0, NULL, '2026-03-26 09:36:06', '2026-03-28 13:18:41', '2026-03-28'),
(38, 'Task 27', 'This is the description for task 27', 26, 26, 5, '2026-03-15', '2026-03-18', 'Completed', 0, 'High', 0, NULL, '2026-03-26 09:36:06', '2026-03-26 11:17:02', NULL),
(39, 'Task 28', 'This is the description for task 28', 18, 18, 2, '2026-03-15', '2026-03-20', 'Overdue', 0, 'Medium', 0, NULL, '2026-03-26 09:36:06', '2026-03-28 09:43:07', NULL),
(40, 'Task 29', 'This is the description for task 29', 19, 19, 3, '2026-03-15', '2026-03-30', 'Completed', 0, 'Medium', 0, NULL, '2026-03-26 09:36:06', '2026-04-01 15:23:03', '2026-04-01'),
(41, 'Task 30', 'This is the description for task 30', 24, 24, 3, '2026-03-15', '2026-03-21', 'Overdue', 0, 'High', 0, NULL, '2026-03-26 09:36:06', '2026-03-26 11:17:02', NULL),
(42, 'Task 31', 'This is the description for task 31', 20, 20, 4, '2026-03-15', '2026-04-03', 'Ongoing', 0, 'Low', 0, NULL, '2026-03-26 09:36:06', '2026-04-01 15:21:13', NULL),
(43, 'Task 32', 'This is the description for task 32', 30, 30, 4, '2026-03-15', '2026-03-26', 'Completed', 0, 'Low', 0, NULL, '2026-03-26 09:36:06', '2026-03-26 11:17:02', NULL),
(44, 'Task 33', 'This is the description for task 33', 20, 20, 4, '2026-03-15', '2026-04-03', 'Ongoing', 0, 'Medium', 0, NULL, '2026-03-26 09:36:06', '2026-04-01 15:20:56', NULL),
(45, 'Task 34', 'This is the description for task 34', 7, 7, 1, '2026-03-15', '2026-03-20', 'Overdue', 0, 'High', 0, NULL, '2026-03-26 09:36:06', '2026-03-28 09:43:07', NULL),
(46, 'Task 35', 'This is the description for task 35', 7, 7, 1, '2026-03-15', '2026-03-26', 'Completed', 0, 'High', 0, NULL, '2026-03-26 09:36:06', '2026-03-26 11:17:02', NULL),
(47, 'Task 36', 'This is the description for task 36', 6, 6, 1, '2026-03-15', '2026-03-24', 'Overdue', 0, 'Medium', 0, NULL, '2026-03-26 09:36:06', '2026-03-28 09:48:07', NULL),
(48, 'Task 37', 'This is the description for task 37', 2, 2, 2, '2026-03-15', '2026-03-23', 'Overdue', 0, 'Low', 0, NULL, '2026-03-26 09:36:06', '2026-03-28 09:43:07', NULL),
(49, 'Task 38', 'This is the description for task 38', 21, 21, 5, '2026-03-15', '2026-03-29', 'Completed', 0, 'Low', 0, NULL, '2026-03-26 09:36:06', '2026-03-26 11:17:02', NULL),
(50, 'Task 39', 'This is the description for task 39', 13, 13, 2, '2026-03-15', '2026-03-19', 'Overdue', 0, 'High', 0, NULL, '2026-03-26 09:36:06', '2026-03-26 11:17:02', NULL),
(51, 'Task 40', 'This is the description for task 40', 28, 28, 2, '2026-03-15', '2026-03-17', 'Overdue', 0, 'Low', 0, NULL, '2026-03-26 09:36:06', '2026-03-26 11:17:02', NULL),
(52, 'Task 41', 'This is the description for task 41', 21, 21, 5, '2026-03-15', '2026-04-02', 'Ongoing', 0, 'Low', 0, NULL, '2026-03-26 09:36:06', '2026-04-01 15:19:48', NULL),
(53, 'Task 42', 'This is the description for task 42', 15, 15, 4, '2026-03-15', '2026-03-28', 'Completed', 0, 'High', 0, NULL, '2026-03-26 09:36:06', '2026-04-03 10:09:25', '2026-04-03'),
(54, 'Task 43', 'This is the description for task 43', 13, 13, 2, '2026-03-15', '2026-03-30', 'Completed', 0, 'High', 0, NULL, '2026-03-26 09:36:06', '2026-04-06 08:30:02', '2026-04-06'),
(55, 'Task 44', 'This is the description for task 44', 31, 31, 5, '2026-03-15', '2026-03-22', 'Overdue', 0, 'Medium', 0, NULL, '2026-03-26 09:36:06', '2026-03-28 09:43:07', NULL),
(56, 'Task 45', 'This is the description for task 45', 5, 5, 1, '2026-03-15', '2026-03-19', 'Overdue', 0, 'High', 0, NULL, '2026-03-26 09:36:06', '2026-03-28 09:43:07', NULL),
(57, 'Task 46', 'This is the description for task 46', 18, 18, 2, '2026-03-15', '2026-04-15', 'Ongoing', 0, 'Medium', 0, NULL, '2026-03-26 09:36:06', '2026-04-01 10:02:08', NULL),
(58, 'Task 47', 'This is the description for task 47', 21, 21, 5, '2026-03-15', '2026-03-22', 'Completed', 0, 'Low', 0, NULL, '2026-03-26 09:36:06', '2026-03-31 16:57:26', '2026-03-31'),
(59, 'Task 48', 'This is the description for task 48', 20, 20, 4, '2026-03-15', '2026-03-20', 'Overdue', 0, 'High', 0, NULL, '2026-03-26 09:36:06', '2026-03-28 09:43:07', NULL),
(60, 'Task 49', 'This is the description for task 49', 22, 22, 1, '2026-03-30', '2026-03-30', 'Completed', 0, 'Medium', 0, NULL, '2026-03-26 09:36:06', '2026-03-30 15:27:55', '2026-03-30'),
(61, 'Task 50', 'This is the description for task 50', 26, 26, 5, '2026-03-15', '2026-04-03', 'Ongoing', 0, 'Low', 0, NULL, '2026-03-26 09:36:06', '2026-04-01 15:19:43', NULL),
(75, 'Cezar Task', '', 3, 3, 1, '2026-03-26', '2026-03-28', 'Overdue', 0, 'Low', 0, NULL, '2026-03-26 11:22:13', '2026-03-28 09:43:07', NULL),
(76, 'Testing', '', 4, 4, 1, '2026-03-26', '2026-03-28', 'Completed', 0, 'Low', 0, NULL, '2026-03-27 08:11:28', '2026-03-30 10:45:47', '2026-03-30'),
(78, 'Testing 2', '', 4, 4, 1, '2026-03-17', '2026-03-20', 'Completed', 0, 'Low', 0, NULL, '2026-03-27 08:17:13', '2026-03-30 10:47:43', '2026-03-30'),
(79, 'Testing 3', '', 4, 4, 1, '2026-03-28', '2026-03-31', 'Completed', 0, 'Low', 0, NULL, '2026-03-27 08:19:19', '2026-04-01 14:59:00', '2026-04-01'),
(80, 'Today task', '', 4, 4, 1, '2026-03-30', '2026-03-30', 'Ongoing', 0, 'High', 0, NULL, '2026-03-30 10:42:50', '2026-03-30 11:22:29', '2026-03-30'),
(81, 'My task', '', 4, 4, 1, '2026-03-16', '2026-03-23', 'Completed', 0, 'High', 0, NULL, '2026-03-30 10:52:05', '2026-03-30 10:52:52', '2026-03-30'),
(82, 'Generate Report', 'Generate report for SPED Clients', 13, 13, 2, '2026-04-06', '2026-04-11', 'Ongoing', 0, 'Low', 0, NULL, '2026-04-06 15:42:05', '2026-04-06 15:42:05', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `nickname` varchar(100) DEFAULT NULL,
  `first_name` varchar(255) NOT NULL,
  `last_name` varchar(255) NOT NULL,
  `middle_initial` char(1) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','supervisor','staff','executive_director','president') NOT NULL DEFAULT 'staff',
  `contact` int(11) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `gender` enum('Male','Female','Rather not say') DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `department` varchar(100) DEFAULT NULL,
  `department_id` int(10) UNSIGNED DEFAULT NULL,
  `employee_id` varchar(50) DEFAULT NULL,
  `profile_image` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `last_active_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `nickname`, `first_name`, `last_name`, `middle_initial`, `email`, `password`, `role`, `contact`, `address`, `gender`, `date_of_birth`, `is_active`, `department`, `department_id`, `employee_id`, `profile_image`, `created_at`, `updated_at`, `last_active_at`) VALUES
(2, 'Ivan Lee Almadrones', NULL, '', '', NULL, 'leeivanalmadrones6@gmail.com', '$2y$10$ThvlURun.5KccFcz/iFrNuL2fKc41cbLoskeQL3f9OdHNaXXpRToi', 'staff', NULL, NULL, NULL, NULL, 1, '1', 2, NULL, NULL, '2026-03-18 09:49:21', '2026-03-25 16:32:51', NULL),
(3, 'Cezar Bernandino', NULL, '', '', NULL, 'bernandinocezar@gmail.com', '$2y$10$J0LBGNn/sKSF4y5lLobtJ.DKCdSxDu9I5dDqoK08CwxfAD1dDW5x2', 'admin', NULL, NULL, NULL, NULL, 1, '1', 1, NULL, NULL, '2026-03-20 09:25:02', '2026-04-04 10:35:45', NULL),
(4, 'Zar Bernardo', NULL, '', '', NULL, 'bernardozar@gmail.com', '$2y$10$J0LBGNn/sKSF4y5lLobtJ.DKCdSxDu9I5dDqoK08CwxfAD1dDW5x2', 'staff', 987654321, 'P3 Lugui', NULL, NULL, 1, NULL, 1, NULL, NULL, '2026-03-25 13:18:00', '2026-03-27 15:47:27', NULL),
(5, 'Justin Marigal', NULL, '', '', NULL, 'madrigaljustin@gmail.com', '$2y$10$J0LBGNn/sKSF4y5lLobtJ.DKCdSxDu9I5dDqoK08CwxfAD1dDW5x2', 'staff', NULL, NULL, NULL, NULL, 1, NULL, 1, NULL, NULL, '2026-03-25 13:20:52', '2026-03-25 13:20:52', NULL),
(6, 'Samantha Velasquez', NULL, '', '', NULL, 'velasquezsamantha@gmail.com', '$2y$10$J0LBGNn/sKSF4y5lLobtJ.DKCdSxDu9I5dDqoK08CwxfAD1dDW5x2', 'staff', NULL, NULL, NULL, NULL, 1, NULL, 1, NULL, NULL, '2026-03-25 13:22:29', '2026-03-25 13:22:29', NULL),
(7, 'Juan Dela Cruz', NULL, '', '', NULL, 'juan.delacruz1@example.com', '$2y$10$J0LBGNn/sKSF4y5lLobtJ.DKCdSxDu9I5dDqoK08CwxfAD1dDW5x2', 'staff', NULL, NULL, NULL, NULL, 1, NULL, 1, NULL, NULL, '2026-03-25 19:35:43', '2026-03-25 19:35:43', NULL),
(8, 'Maria Santos', NULL, '', '', NULL, 'maria.santos2@example.com', '$2y$10$J0LBGNn/sKSF4y5lLobtJ.DKCdSxDu9I5dDqoK08CwxfAD1dDW5x2', 'supervisor', NULL, NULL, NULL, NULL, 1, NULL, 2, NULL, NULL, '2026-03-25 19:35:43', '2026-04-13 15:38:00', '2026-04-13 15:38:00'),
(9, 'Joseph Rizal', NULL, '', '', NULL, 'joseph.rizal3@example.com', '$2y$10$J0LBGNn/sKSF4y5lLobtJ.DKCdSxDu9I5dDqoK08CwxfAD1dDW5x2', 'supervisor', NULL, NULL, NULL, NULL, 1, NULL, 3, NULL, NULL, '2026-03-25 19:35:43', '2026-03-26 09:10:12', NULL),
(10, 'Ana Lim', NULL, '', '', NULL, 'ana.lim4@example.com', '$2y$10$J0LBGNn/sKSF4y5lLobtJ.DKCdSxDu9I5dDqoK08CwxfAD1dDW5x2', 'supervisor', NULL, NULL, NULL, NULL, 1, NULL, 4, NULL, NULL, '2026-03-25 19:35:43', '2026-04-04 10:41:02', NULL),
(11, 'Pedro Gonzalez', NULL, '', '', NULL, 'pedro.gonzalez5@example.com', '$2y$10$J0LBGNn/sKSF4y5lLobtJ.DKCdSxDu9I5dDqoK08CwxfAD1dDW5x2', 'admin', NULL, NULL, NULL, NULL, 1, NULL, 5, NULL, NULL, '2026-03-25 19:35:43', '2026-04-07 13:44:33', NULL),
(12, 'Catherine Reyes', NULL, '', '', NULL, 'catherine.reyes6@example.com', '$2y$10$J0LBGNn/sKSF4y5lLobtJ.DKCdSxDu9I5dDqoK08CwxfAD1dDW5x2', 'staff', NULL, NULL, NULL, NULL, 1, NULL, 1, NULL, NULL, '2026-03-25 19:35:43', '2026-03-25 19:35:43', NULL),
(13, 'Mark Villanueva', NULL, '', '', NULL, 'mark.villanueva7@example.com', '$2y$10$J0LBGNn/sKSF4y5lLobtJ.DKCdSxDu9I5dDqoK08CwxfAD1dDW5x2', 'staff', NULL, NULL, NULL, NULL, 1, NULL, 2, NULL, NULL, '2026-03-25 19:35:43', '2026-03-25 19:35:43', NULL),
(14, 'Kristine Cruz', NULL, '', '', NULL, 'kristine.cruz8@example.com', '$2y$10$J0LBGNn/sKSF4y5lLobtJ.DKCdSxDu9I5dDqoK08CwxfAD1dDW5x2', 'staff', NULL, NULL, NULL, NULL, 1, NULL, 3, NULL, NULL, '2026-03-25 19:35:43', '2026-03-25 19:35:43', NULL),
(15, 'Luis Mendoza', NULL, '', '', NULL, 'luis.mendoza9@example.com', '$2y$10$J0LBGNn/sKSF4y5lLobtJ.DKCdSxDu9I5dDqoK08CwxfAD1dDW5x2', 'staff', NULL, NULL, NULL, NULL, 1, NULL, 4, NULL, NULL, '2026-03-25 19:35:43', '2026-03-25 19:35:43', NULL),
(16, 'Grace Aquino', NULL, '', '', NULL, 'grace.aquino10@example.com', '$2y$10$J0LBGNn/sKSF4y5lLobtJ.DKCdSxDu9I5dDqoK08CwxfAD1dDW5x2', 'staff', NULL, NULL, NULL, NULL, 1, NULL, 5, NULL, NULL, '2026-03-25 19:35:43', '2026-03-25 19:35:43', NULL),
(17, 'Ramon Bautista', NULL, '', '', NULL, 'ramon.bautista11@example.com', '$2y$10$J0LBGNn/sKSF4y5lLobtJ.DKCdSxDu9I5dDqoK08CwxfAD1dDW5x2', 'staff', NULL, NULL, NULL, NULL, 1, NULL, 1, NULL, NULL, '2026-03-25 19:35:43', '2026-03-25 19:35:43', NULL),
(18, 'Jessica Tan', NULL, '', '', NULL, 'jessica.tan12@example.com', '$2y$10$J0LBGNn/sKSF4y5lLobtJ.DKCdSxDu9I5dDqoK08CwxfAD1dDW5x2', 'staff', NULL, NULL, NULL, NULL, 1, NULL, 2, NULL, NULL, '2026-03-25 19:35:43', '2026-03-25 19:35:43', NULL),
(19, 'Miguel Santos', NULL, '', '', NULL, 'miguel.santos13@example.com', '$2y$10$J0LBGNn/sKSF4y5lLobtJ.DKCdSxDu9I5dDqoK08CwxfAD1dDW5x2', 'staff', NULL, NULL, NULL, NULL, 1, NULL, 3, NULL, NULL, '2026-03-25 19:35:43', '2026-03-25 19:35:43', NULL),
(20, 'Liza dela Rosa', NULL, '', '', NULL, 'liza.delarosa14@example.com', '$2y$10$J0LBGNn/sKSF4y5lLobtJ.DKCdSxDu9I5dDqoK08CwxfAD1dDW5x2', 'staff', NULL, NULL, NULL, NULL, 1, NULL, 4, NULL, NULL, '2026-03-25 19:35:43', '2026-03-25 19:35:43', NULL),
(21, 'Arnel Gonzales', NULL, '', '', NULL, 'arnel.gonzales15@example.com', '$2y$10$J0LBGNn/sKSF4y5lLobtJ.DKCdSxDu9I5dDqoK08CwxfAD1dDW5x2', 'staff', NULL, NULL, NULL, NULL, 1, NULL, 5, NULL, NULL, '2026-03-25 19:35:43', '2026-03-25 19:35:43', NULL),
(22, 'Melanie Cruz', NULL, '', '', NULL, 'melanie.cruz16@example.com', '$2y$10$J0LBGNn/sKSF4y5lLobtJ.DKCdSxDu9I5dDqoK08CwxfAD1dDW5x2', 'staff', NULL, NULL, NULL, NULL, 1, NULL, 1, NULL, NULL, '2026-03-25 19:35:43', '2026-03-25 19:35:43', NULL),
(23, 'Anthony Ramos', NULL, '', '', NULL, 'anthony.ramos17@example.com', '$2y$10$J0LBGNn/sKSF4y5lLobtJ.DKCdSxDu9I5dDqoK08CwxfAD1dDW5x2', 'staff', NULL, NULL, NULL, NULL, 1, NULL, 2, NULL, NULL, '2026-03-25 19:35:43', '2026-03-25 19:35:43', NULL),
(24, 'Carla Navarro', NULL, '', '', NULL, 'carla.navarro18@example.com', '$2y$10$J0LBGNn/sKSF4y5lLobtJ.DKCdSxDu9I5dDqoK08CwxfAD1dDW5x2', 'staff', NULL, NULL, NULL, NULL, 1, NULL, 3, NULL, NULL, '2026-03-25 19:35:43', '2026-03-25 19:35:43', NULL),
(25, 'Rafael Lim', NULL, '', '', NULL, 'rafael.lim19@example.com', '$2y$10$J0LBGNn/sKSF4y5lLobtJ.DKCdSxDu9I5dDqoK08CwxfAD1dDW5x2', 'staff', NULL, NULL, NULL, NULL, 1, NULL, 4, NULL, NULL, '2026-03-25 19:35:43', '2026-03-25 19:35:43', NULL),
(26, 'Elaine Fernandez', NULL, '', '', NULL, 'elaine.fernandez20@example.com', '$2y$10$J0LBGNn/sKSF4y5lLobtJ.DKCdSxDu9I5dDqoK08CwxfAD1dDW5x2', 'staff', NULL, NULL, NULL, NULL, 1, NULL, 5, NULL, NULL, '2026-03-25 19:35:43', '2026-03-25 19:35:43', NULL),
(27, 'Dennis Tan', NULL, '', '', NULL, 'dennis.tan21@example.com', '$2y$10$J0LBGNn/sKSF4y5lLobtJ.DKCdSxDu9I5dDqoK08CwxfAD1dDW5x2', 'staff', NULL, NULL, NULL, NULL, 1, NULL, 1, NULL, NULL, '2026-03-25 19:35:43', '2026-03-25 19:35:43', NULL),
(28, 'Sophia Reyes', NULL, '', '', NULL, 'sophia.reyes22@example.com', '$2y$10$J0LBGNn/sKSF4y5lLobtJ.DKCdSxDu9I5dDqoK08CwxfAD1dDW5x2', 'staff', NULL, NULL, NULL, NULL, 1, NULL, 2, NULL, NULL, '2026-03-25 19:35:43', '2026-03-25 19:35:43', NULL),
(29, 'Victor Mendoza', NULL, '', '', NULL, 'victor.mendoza23@example.com', '$2y$10$J0LBGNn/sKSF4y5lLobtJ.DKCdSxDu9I5dDqoK08CwxfAD1dDW5x2', 'staff', NULL, NULL, NULL, NULL, 1, NULL, 6, NULL, NULL, '2026-03-25 19:35:43', '2026-03-26 11:35:49', NULL),
(30, 'Angela Santos', NULL, '', '', NULL, 'angela.santos24@example.com', '$2y$10$J0LBGNn/sKSF4y5lLobtJ.DKCdSxDu9I5dDqoK08CwxfAD1dDW5x2', 'staff', NULL, NULL, NULL, NULL, 1, NULL, 4, NULL, NULL, '2026-03-25 19:35:43', '2026-03-25 19:35:43', NULL),
(31, 'Johan dela Cruz', NULL, '', '', NULL, 'johan.delacruz25@example.com', '$2y$10$J0LBGNn/sKSF4y5lLobtJ.DKCdSxDu9I5dDqoK08CwxfAD1dDW5x2', 'staff', NULL, NULL, NULL, NULL, 1, NULL, 5, NULL, NULL, '2026-03-25 19:35:43', '2026-03-25 19:35:43', NULL),
(32, 'Razec Bernandino', NULL, '', '', NULL, 'cezarbernandino12@gmail.com', '$2y$10$V0J5nhn8i6rHF.JZfTpzSO4QTsSMUhcUTVKcNexpIHc13XYxBUNqW', 'staff', 2147483647, '98780-', NULL, NULL, 1, NULL, 1, NULL, NULL, '2026-03-27 15:56:29', '2026-03-27 15:56:29', NULL),
(33, 'Lor A. ff', 'f', 'Lor', 'ff', 'A', 'cezarbernandino12@gmail.co', '$2y$10$QqrIl1uvqs5/xrjuf7PpD.5PMXmsJlMCkO6JCwsJA099O3r88yYzi', '', 2147483647, 'P3 Lugui', 'Male', '2026-04-17', 1, 'Accounting', 5, NULL, NULL, '2026-04-03 14:35:30', '2026-04-03 14:35:30', NULL),
(34, 'Rassel Victor', 'Raz', '', '', NULL, 'cezarbernandino2003@gmail.com', '$2y$10$TqseXGySo4n7iLNTZxCRPe3txNOzT7.MfwKbQVBhpd6XcKUwuL/F2', 'staff', 2147483647, 'P3 Lugui', 'Male', '1999-02-10', 1, NULL, NULL, '902039', NULL, '2026-04-03 16:47:48', '2026-04-03 16:47:48', NULL),
(35, 'Wilbert Fernandez', 'Will', '', '', NULL, 'willbert@gmail.com', '$2y$10$uwkYBBxhFB9TCLc/SpBSuOMSJ6RkwrLAjNd41sKefKInvrtgSZs5u', 'staff', 2147483647, 'Barangay Buting', 'Male', '1999-02-03', 1, NULL, NULL, '001-001', NULL, '2026-04-03 16:55:32', '2026-04-03 16:55:32', NULL),
(36, 'cezhajmf', 'wert', '', '', NULL, '2345yuh@gmail.com', '$2y$10$NHnvXHLJcjghMD9.jV.RWuTu.BAzRthd.2rXrUuQeinglmww6wbRO', 'staff', 293993, 'rkfjndc', 'Male', '2026-04-15', 0, NULL, NULL, '234', NULL, '2026-04-04 10:47:52', '2026-04-04 10:47:52', NULL),
(37, 'Mark Martin', 'marki', '', '', NULL, 'markmartin@gmail.com', '$2y$10$xbEpJv4ZCy.5g7YC3p.JN.7rOzcTs3cUg9cZlChODqVtkdW7XzOku', 'executive_director', 2147483647, 'Buting', 'Male', '2026-03-11', 1, NULL, NULL, '090909', NULL, '2026-04-06 10:15:16', '2026-04-06 10:15:16', NULL);

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
-- Indexes for table `events`
--
ALTER TABLE `events`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_events_dates` (`start_date`,`end_date`),
  ADD KEY `idx_events_status` (`status`),
  ADD KEY `idx_events_created` (`created_by`);

--
-- Indexes for table `event_employees`
--
ALTER TABLE `event_employees`
  ADD PRIMARY KEY (`event_id`,`user_id`),
  ADD KEY `idx_ee_user` (`user_id`);

--
-- Indexes for table `messages`
--
ALTER TABLE `messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_sender` (`sender_id`),
  ADD KEY `idx_recipient` (`recipient_id`),
  ADD KEY `idx_task` (`task_id`);

--
-- Indexes for table `message_attachments`
--
ALTER TABLE `message_attachments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `message_id` (`message_id`);

--
-- Indexes for table `strategic_plans`
--
ALTER TABLE `strategic_plans`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_created_by` (`created_by`);

--
-- Indexes for table `strategic_plan_goals`
--
ALTER TABLE `strategic_plan_goals`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_spg_plan` (`plan_id`);

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
  ADD UNIQUE KEY `uq_users_employee_id` (`employee_id`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_role` (`role`),
  ADD KEY `idx_active` (`is_active`),
  ADD KEY `idx_department_id` (`department_id`),
  ADD KEY `idx_users_last_active_at` (`last_active_at`);

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
-- AUTO_INCREMENT for table `events`
--
ALTER TABLE `events`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;

--
-- AUTO_INCREMENT for table `messages`
--
ALTER TABLE `messages`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT for table `message_attachments`
--
ALTER TABLE `message_attachments`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `strategic_plans`
--
ALTER TABLE `strategic_plans`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `strategic_plan_goals`
--
ALTER TABLE `strategic_plan_goals`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `tasks`
--
ALTER TABLE `tasks`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=83;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=38;

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
-- Constraints for table `events`
--
ALTER TABLE `events`
  ADD CONSTRAINT `fk_events_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `event_employees`
--
ALTER TABLE `event_employees`
  ADD CONSTRAINT `fk_ee_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ee_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `messages`
--
ALTER TABLE `messages`
  ADD CONSTRAINT `fk_messages_recipient` FOREIGN KEY (`recipient_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_messages_sender` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_messages_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `message_attachments`
--
ALTER TABLE `message_attachments`
  ADD CONSTRAINT `message_attachments_ibfk_1` FOREIGN KEY (`message_id`) REFERENCES `messages` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `strategic_plan_goals`
--
ALTER TABLE `strategic_plan_goals`
  ADD CONSTRAINT `fk_spg_plan` FOREIGN KEY (`plan_id`) REFERENCES `strategic_plans` (`id`) ON DELETE CASCADE;

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

-- ====================================================================
-- Activity Logs Table
-- Run this once against your database.
-- ====================================================================
CREATE TABLE IF NOT EXISTS activity_logs (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id     INT UNSIGNED        NOT NULL,
    user_name   VARCHAR(255)        NOT NULL DEFAULT '',
    role        VARCHAR(50)         NOT NULL DEFAULT '',
    action      VARCHAR(100)        NOT NULL,
    target_type VARCHAR(50)         DEFAULT NULL,
    target_id   INT UNSIGNED        DEFAULT NULL,
    description TEXT                DEFAULT NULL,
    created_at  DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_action      (action),
    INDEX idx_user_id     (user_id),
    INDEX idx_created_at  (created_at),
    INDEX idx_target      (target_type, target_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Language Learning Center Management Platform — MySQL Schema
-- Engine: InnoDB  |  Charset: utf8mb4  |  Collation: utf8mb4_unicode_ci
-- Target: MySQL 8.0+
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ENUMS (MySQL 8.0+ CHECK constraints or ENUM types)
-- ----------------------------------------------------------------------------
-- NOTE: MySQL ENUM is used for simplicity. For strict ANSI compliance,
-- replace with VARCHAR + CHECK constraints.

-- ----------------------------------------------------------------------------
-- 1. CORE AUTH / USER
-- ----------------------------------------------------------------------------
CREATE TABLE `User` (
    `id`            VARCHAR(30)     NOT NULL,
    `email`         VARCHAR(255)    NOT NULL,
    `password`      VARCHAR(255)    NOT NULL,
    `name`          VARCHAR(255)    NOT NULL,
    `phone`         VARCHAR(30)     DEFAULT NULL,
    `role`          ENUM('SuperAdmin','Admin','Teacher','Student','Parent') NOT NULL DEFAULT 'Student',
    `locale`        VARCHAR(10)     NOT NULL DEFAULT 'en',
    `theme`         VARCHAR(20)     NOT NULL DEFAULT 'light',
    `avatar`        VARCHAR(500)    DEFAULT NULL,
    `isActive`      TINYINT(1)      NOT NULL DEFAULT 1,
    `createdAt`     DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`     DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `idx_user_role` (`role`),
    INDEX `idx_user_isActive` (`isActive`),
    INDEX `idx_user_role_isActive` (`role`, `isActive`),
    UNIQUE INDEX `idx_user_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 2. PROFILES
-- ----------------------------------------------------------------------------
CREATE TABLE `StudentProfile` (
    `id`                VARCHAR(30)     NOT NULL,
    `userId`            VARCHAR(30)     NOT NULL,
    `dateOfBirth`       DATE            DEFAULT NULL,
    `nationalId`        VARCHAR(50)     DEFAULT NULL,
    `emergencyContact`  VARCHAR(50)     DEFAULT NULL,
    `guardianName`      VARCHAR(255)    DEFAULT NULL,
    `guardianPhone`     VARCHAR(30)     DEFAULT NULL,
    `notes`             TEXT            DEFAULT NULL,
    `createdAt`         DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`         DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    UNIQUE INDEX `idx_studentprofile_userId` (`userId`),
    CONSTRAINT `fk_studentprofile_user` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `TeacherProfile` (
    `id`                VARCHAR(30)     NOT NULL,
    `userId`            VARCHAR(30)     NOT NULL,
    `specialization`    VARCHAR(255)    DEFAULT NULL,
    `hireDate`          DATE            DEFAULT NULL,
    `hourlyRate`        DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    `isActive`          TINYINT(1)      NOT NULL DEFAULT 1,
    `createdAt`         DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`         DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    UNIQUE INDEX `idx_teacherprofile_userId` (`userId`),
    INDEX `idx_teacherprofile_isActive` (`isActive`),
    CONSTRAINT `fk_teacherprofile_user` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 3. ACADEMIC STRUCTURE (Language → Level → Course → ClassGroup)
-- ----------------------------------------------------------------------------
CREATE TABLE `Language` (
    `id`        VARCHAR(30)     NOT NULL,
    `name`      VARCHAR(255)    NOT NULL,
    `code`      VARCHAR(10)     NOT NULL,
    `isActive`  TINYINT(1)      NOT NULL DEFAULT 1,
    PRIMARY KEY (`id`),
    UNIQUE INDEX `idx_language_code` (`code`),
    INDEX `idx_language_isActive` (`isActive`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Level` (
    `id`            VARCHAR(30)     NOT NULL,
    `languageId`    VARCHAR(30)     NOT NULL,
    `name`          VARCHAR(255)    NOT NULL,
    `code`          VARCHAR(50)     NOT NULL,
    `order`         INT             NOT NULL,
    `description`   TEXT            DEFAULT NULL,
    `price`         DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    `isActive`      TINYINT(1)      NOT NULL DEFAULT 1,
    PRIMARY KEY (`id`),
    INDEX `idx_level_languageId` (`languageId`),
    INDEX `idx_level_languageId_order` (`languageId`, `order`),
    INDEX `idx_level_isActive` (`isActive`),
    UNIQUE INDEX `idx_level_code_language` (`languageId`, `code`),
    CONSTRAINT `fk_level_language` FOREIGN KEY (`languageId`) REFERENCES `Language`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Course` (
    `id`                 VARCHAR(30)     NOT NULL,
    `languageId`         VARCHAR(30)     NOT NULL,
    `levelId`            VARCHAR(30)     NOT NULL,
    `name`               VARCHAR(255)    NOT NULL,
    `code`               VARCHAR(50)     NOT NULL,
    `description`        TEXT            DEFAULT NULL,
    `maxStudents`        INT             NOT NULL DEFAULT 0,
    `registrationOpen`   TINYINT(1)      NOT NULL DEFAULT 0,
    `registrationStart`  DATETIME(3)     DEFAULT NULL,
    `registrationEnd`    DATETIME(3)     DEFAULT NULL,
    `isActive`           TINYINT(1)      NOT NULL DEFAULT 1,
    `createdAt`          DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`          DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    UNIQUE INDEX `idx_course_code` (`code`),
    INDEX `idx_course_languageId` (`languageId`),
    INDEX `idx_course_levelId` (`levelId`),
    INDEX `idx_course_languageId_isActive` (`languageId`, `isActive`),
    INDEX `idx_course_registrationOpen` (`registrationOpen`, `registrationStart`, `registrationEnd`),
    INDEX `idx_course_isActive` (`isActive`),
    CONSTRAINT `fk_course_language` FOREIGN KEY (`languageId`) REFERENCES `Language`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_course_level` FOREIGN KEY (`levelId`) REFERENCES `Level`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ClassGroup` (
    `id`            VARCHAR(30)     NOT NULL,
    `courseId`      VARCHAR(30)     NOT NULL,
    `name`          VARCHAR(255)    NOT NULL,
    `teacherId`     VARCHAR(30)     NOT NULL,
    `room`          VARCHAR(50)     DEFAULT NULL,
    `startDate`     DATE            DEFAULT NULL,
    `endDate`       DATE            DEFAULT NULL,
    `maxCapacity`   INT             NOT NULL DEFAULT 30,
    `isActive`      TINYINT(1)      NOT NULL DEFAULT 1,
    `createdAt`     DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt`     DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `idx_classgroup_courseId` (`courseId`),
    INDEX `idx_classgroup_teacherId` (`teacherId`),
    INDEX `idx_classgroup_teacherId_isActive` (`teacherId`, `isActive`),
    INDEX `idx_classgroup_isActive` (`isActive`),
    CONSTRAINT `fk_classgroup_course` FOREIGN KEY (`courseId`) REFERENCES `Course`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_classgroup_teacher` FOREIGN KEY (`teacherId`) REFERENCES `TeacherProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 4. ENROLLMENT + PREREQUISITE CERTIFICATE
-- ----------------------------------------------------------------------------
CREATE TABLE `Certificate` (
    `id`                VARCHAR(30)     NOT NULL,
    `studentId`         VARCHAR(30)     NOT NULL,
    `levelId`           VARCHAR(30)     NOT NULL,
    `certificateNumber` VARCHAR(100)    NOT NULL,
    `issueDate`         DATE            NOT NULL DEFAULT (CURRENT_DATE),
    `expirationDate`    DATE            NOT NULL,
    `issuedBy`          VARCHAR(255)    DEFAULT NULL,
    `status`            ENUM('Valid','Expired','Revoked') NOT NULL DEFAULT 'Valid',
    PRIMARY KEY (`id`),
    UNIQUE INDEX `idx_certificate_number` (`certificateNumber`),
    INDEX `idx_certificate_studentId` (`studentId`),
    INDEX `idx_certificate_levelId` (`levelId`),
    INDEX `idx_certificate_studentId_levelId` (`studentId`, `levelId`),
    INDEX `idx_certificate_status` (`status`),
    INDEX `idx_certificate_expirationDate` (`expirationDate`),
    -- Covering index for prerequisite validation queries
    INDEX `idx_certificate_lookup` (`studentId`, `levelId`, `status`, `expirationDate`),
    CONSTRAINT `fk_certificate_student` FOREIGN KEY (`studentId`) REFERENCES `StudentProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_certificate_level` FOREIGN KEY (`levelId`) REFERENCES `Level`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Enrollment` (
    `id`                   VARCHAR(30)     NOT NULL,
    `studentId`            VARCHAR(30)     NOT NULL,
    `classGroupId`         VARCHAR(30)     NOT NULL,
    `prerequisiteCertId`   VARCHAR(30)     DEFAULT NULL,
    `enrolledAt`           DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status`               ENUM('Pending','Active','Completed','Dropped') NOT NULL DEFAULT 'Pending',
    `isConfirmedByTeacher` TINYINT(1)      NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    INDEX `idx_enrollment_studentId` (`studentId`),
    INDEX `idx_enrollment_classGroupId` (`classGroupId`),
    INDEX `idx_enrollment_prerequisiteCertId` (`prerequisiteCertId`),
    INDEX `idx_enrollment_status` (`status`),
    INDEX `idx_enrollment_classGroupId_status` (`classGroupId`, `status`),
    INDEX `idx_enrollment_studentId_status` (`studentId`, `status`),
    -- Teacher confirmation queries
    INDEX `idx_enrollment_classGroupId_confirmed` (`classGroupId`, `isConfirmedByTeacher`),
    CONSTRAINT `fk_enrollment_student` FOREIGN KEY (`studentId`) REFERENCES `StudentProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_enrollment_classgroup` FOREIGN KEY (`classGroupId`) REFERENCES `ClassGroup`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_enrollment_certificate` FOREIGN KEY (`prerequisiteCertId`) REFERENCES `Certificate`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 5. ATTENDANCE
-- ----------------------------------------------------------------------------
CREATE TABLE `Attendance` (
    `id`            VARCHAR(30)     NOT NULL,
    `enrollmentId`  VARCHAR(30)     NOT NULL,
    `date`          DATE            NOT NULL,
    `status`        ENUM('Present','Absent','Late','Excused') NOT NULL DEFAULT 'Present',
    `createdAt`     DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `idx_attendance_enrollmentId` (`enrollmentId`),
    -- High-traffic query: attendance report for a student per class on a date range
    INDEX `idx_attendance_enrollmentId_date` (`enrollmentId`, `date`),
    INDEX `idx_attendance_date` (`date`),
    INDEX `idx_attendance_enrollmentId_status` (`enrollmentId`, `status`),
    CONSTRAINT `fk_attendance_enrollment` FOREIGN KEY (`enrollmentId`) REFERENCES `Enrollment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 6. EXAMS + GRADES
-- ----------------------------------------------------------------------------
CREATE TABLE `Exam` (
    `id`            VARCHAR(30)     NOT NULL,
    `classGroupId`  VARCHAR(30)     NOT NULL,
    `name`          VARCHAR(255)    NOT NULL,
    `date`          DATETIME(3)     DEFAULT NULL,
    `maxScore`      DECIMAL(10,2)   NOT NULL DEFAULT 100.00,
    `createdAt`     DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `idx_exam_classGroupId` (`classGroupId`),
    INDEX `idx_exam_date` (`date`),
    CONSTRAINT `fk_exam_classgroup` FOREIGN KEY (`classGroupId`) REFERENCES `ClassGroup`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Grade` (
    `id`            VARCHAR(30)     NOT NULL,
    `enrollmentId`  VARCHAR(30)     NOT NULL,
    `examId`        VARCHAR(30)     NOT NULL,
    `score`         DECIMAL(10,2)   NOT NULL,
    `gradedAt`      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `gradedBy`      VARCHAR(30)     DEFAULT NULL,
    PRIMARY KEY (`id`),
    INDEX `idx_grade_enrollmentId` (`enrollmentId`),
    INDEX `idx_grade_examId` (`examId`),
    UNIQUE INDEX `idx_grade_enrollment_exam` (`enrollmentId`, `examId`),
    INDEX `idx_grade_examId_score` (`examId`, `score`),
    CONSTRAINT `fk_grade_enrollment` FOREIGN KEY (`enrollmentId`) REFERENCES `Enrollment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_grade_exam` FOREIGN KEY (`examId`) REFERENCES `Exam`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_grade_gradedBy` FOREIGN KEY (`gradedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 7. SCHEDULE (weekly timetable per class group)
-- ----------------------------------------------------------------------------
CREATE TABLE `Schedule` (
    `id`            VARCHAR(30)     NOT NULL,
    `classGroupId`  VARCHAR(30)     NOT NULL,
    `dayOfWeek`     TINYINT         NOT NULL COMMENT '0=Sunday, 1=Monday ... 6=Saturday',
    `startTime`     VARCHAR(10)     NOT NULL COMMENT 'HH:mm format',
    `endTime`       VARCHAR(10)     NOT NULL COMMENT 'HH:mm format',
    `room`          VARCHAR(50)     DEFAULT NULL,
    PRIMARY KEY (`id`),
    INDEX `idx_schedule_classGroupId` (`classGroupId`),
    INDEX `idx_schedule_classGroupId_dayOfWeek` (`classGroupId`, `dayOfWeek`),
    CONSTRAINT `fk_schedule_classgroup` FOREIGN KEY (`classGroupId`) REFERENCES `ClassGroup`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 8. FINANCIAL
-- ----------------------------------------------------------------------------
CREATE TABLE `Payment` (
    `id`            VARCHAR(30)     NOT NULL,
    `enrollmentId`  VARCHAR(30)     NOT NULL,
    `amount`        DECIMAL(10,2)   NOT NULL,
    `dueDate`       DATE            NOT NULL,
    `paidDate`      DATE            DEFAULT NULL,
    `status`        ENUM('Pending','Paid','Overdue') NOT NULL DEFAULT 'Pending',
    `method`        ENUM('Cash','Transfer','Receipt') NOT NULL DEFAULT 'Cash',
    `receiptUrl`    VARCHAR(500)    DEFAULT NULL,
    `verifiedById`  VARCHAR(30)     DEFAULT NULL,
    `createdAt`     DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `idx_payment_enrollmentId` (`enrollmentId`),
    INDEX `idx_payment_status` (`status`),
    INDEX `idx_payment_dueDate` (`dueDate`),
    -- Overdue payment detection query
    INDEX `idx_payment_status_dueDate` (`status`, `dueDate`),
    INDEX `idx_payment_verifiedById` (`verifiedById`),
    CONSTRAINT `fk_payment_enrollment` FOREIGN KEY (`enrollmentId`) REFERENCES `Enrollment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_payment_verifiedBy` FOREIGN KEY (`verifiedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `TeacherPayout` (
    `id`            VARCHAR(30)     NOT NULL,
    `teacherId`     VARCHAR(30)     NOT NULL,
    `periodStart`   DATE            NOT NULL,
    `periodEnd`     DATE            NOT NULL,
    `hoursWorked`   DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    `rate`          DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    `grossAmount`   DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    `deductions`    DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    `netAmount`     DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    `status`        ENUM('Pending','Approved','Paid') NOT NULL DEFAULT 'Pending',
    `paidAt`        DATETIME(3)     DEFAULT NULL,
    `createdAt`     DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `idx_teacherpayout_teacherId` (`teacherId`),
    INDEX `idx_teacherpayout_status` (`status`),
    INDEX `idx_teacherpayout_teacherId_status` (`teacherId`, `status`),
    INDEX `idx_teacherpayout_periodEnd` (`periodEnd`),
    CONSTRAINT `fk_teacherpayout_teacher` FOREIGN KEY (`teacherId`) REFERENCES `TeacherProfile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 9. NOTIFICATIONS
-- ----------------------------------------------------------------------------
CREATE TABLE `Notification` (
    `id`            VARCHAR(30)     NOT NULL,
    `userId`        VARCHAR(30)     NOT NULL,
    `type`          VARCHAR(50)     NOT NULL,
    `channel`       VARCHAR(20)     NOT NULL DEFAULT 'in_app',
    `title`         VARCHAR(255)    NOT NULL,
    `messageEn`     TEXT            DEFAULT NULL,
    `messageAr`     TEXT            DEFAULT NULL,
    `data`          JSON            DEFAULT NULL,
    `isRead`        TINYINT(1)      NOT NULL DEFAULT 0,
    `createdAt`     DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `idx_notification_userId` (`userId`),
    INDEX `idx_notification_userId_isRead` (`userId`, `isRead`),
    INDEX `idx_notification_userId_createdAt` (`userId`, `createdAt` DESC),
    INDEX `idx_notification_type` (`type`),
    CONSTRAINT `fk_notification_user` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 10. AUDIT LOGGING
-- ----------------------------------------------------------------------------
CREATE TABLE `AuditLog` (
    `id`              VARCHAR(30)     NOT NULL,
    `userId`          VARCHAR(30)     DEFAULT NULL,
    `action`          VARCHAR(100)    NOT NULL,
    `tableAffected`   VARCHAR(100)    DEFAULT NULL,
    `recordId`        VARCHAR(30)     DEFAULT NULL,
    `oldValue`        JSON            DEFAULT NULL,
    `newValue`        JSON            DEFAULT NULL,
    `ipAddress`       VARCHAR(45)     DEFAULT NULL COMMENT 'supports IPv6',
    `timestamp`       DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `idx_auditlog_userId` (`userId`),
    INDEX `idx_auditlog_action` (`action`),
    INDEX `idx_auditlog_tableAffected` (`tableAffected`),
    INDEX `idx_auditlog_timestamp` (`timestamp` DESC),
    -- Common query: filter by action + time range
    INDEX `idx_auditlog_action_timestamp` (`action`, `timestamp` DESC),
    -- Common query: trail for a specific record
    INDEX `idx_auditlog_table_record` (`tableAffected`, `recordId`),
    CONSTRAINT `fk_auditlog_user` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 11. CMS / PUBLIC SITE
-- ----------------------------------------------------------------------------
CREATE TABLE `CmsPage` (
    `id`              VARCHAR(30)     NOT NULL,
    `slug`            VARCHAR(255)    NOT NULL,
    `titleEn`         VARCHAR(255)    NOT NULL,
    `titleAr`         VARCHAR(255)    DEFAULT NULL,
    `contentEn`       LONGTEXT        DEFAULT NULL,
    `contentAr`       LONGTEXT        DEFAULT NULL,
    `seoTitle`        VARCHAR(255)    DEFAULT NULL,
    `seoDescription`  TEXT            DEFAULT NULL,
    `seoKeywords`     TEXT            DEFAULT NULL,
    `isPublished`     TINYINT(1)      NOT NULL DEFAULT 0,
    `publishedAt`     DATETIME(3)     DEFAULT NULL,
    `updatedAt`       DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    UNIQUE INDEX `idx_cmspage_slug` (`slug`),
    INDEX `idx_cmspage_isPublished` (`isPublished`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Media` (
    `id`            VARCHAR(30)     NOT NULL,
    `url`           VARCHAR(500)    NOT NULL,
    `type`          VARCHAR(20)     NOT NULL DEFAULT 'Image',
    `alt`           VARCHAR(255)    DEFAULT NULL,
    `uploadedById`  VARCHAR(30)     DEFAULT NULL,
    `createdAt`     DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `idx_media_type` (`type`),
    INDEX `idx_media_uploadedById` (`uploadedById`),
    CONSTRAINT `fk_media_uploadedBy` FOREIGN KEY (`uploadedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Event` (
    `id`              VARCHAR(30)     NOT NULL,
    `titleEn`         VARCHAR(255)    NOT NULL,
    `titleAr`         VARCHAR(255)    DEFAULT NULL,
    `descriptionEn`   TEXT            DEFAULT NULL,
    `descriptionAr`   TEXT            DEFAULT NULL,
    `date`            DATETIME(3)     DEFAULT NULL,
    `location`        VARCHAR(255)    DEFAULT NULL,
    `imageUrl`        VARCHAR(500)    DEFAULT NULL,
    `isActive`        TINYINT(1)      NOT NULL DEFAULT 1,
    `createdAt`       DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `idx_event_date` (`date`),
    INDEX `idx_event_isActive` (`isActive`),
    INDEX `idx_event_isActive_date` (`isActive`, `date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Testimonial` (
    `id`            VARCHAR(30)     NOT NULL,
    `studentName`   VARCHAR(255)    NOT NULL,
    `contentEn`     TEXT            NOT NULL,
    `contentAr`     TEXT            DEFAULT NULL,
    `rating`        TINYINT         NOT NULL DEFAULT 5 COMMENT '1-5',
    `isActive`      TINYINT(1)      NOT NULL DEFAULT 1,
    `createdAt`     DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `idx_testimonial_isActive` (`isActive`),
    INDEX `idx_testimonial_rating` (`rating`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Faq` (
    `id`            VARCHAR(30)     NOT NULL,
    `questionEn`    TEXT            NOT NULL,
    `questionAr`    TEXT            DEFAULT NULL,
    `answerEn`      TEXT            NOT NULL,
    `answerAr`      TEXT            DEFAULT NULL,
    `order`         INT             NOT NULL DEFAULT 0,
    `isActive`      TINYINT(1)      NOT NULL DEFAULT 1,
    `createdAt`     DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `idx_faq_isActive_order` (`isActive`, `order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 12. SYSTEM SETTINGS
-- ----------------------------------------------------------------------------
CREATE TABLE `SystemSetting` (
    `id`        VARCHAR(30)     NOT NULL,
    `key`       VARCHAR(100)    NOT NULL,
    `value`     JSON            NOT NULL,
    `updatedAt` DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    UNIQUE INDEX `idx_systemsetting_key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- SUMMARY: INDEX COUNT & PURPOSE
-- ============================================================================
-- Total tables: 21
-- Total indexes (incl. PK / UNIQUE / FK): ~90
--
-- High-performance design notes:
-- 1. Composite indexes match the 3 most common query patterns:
--    - Filter by FK + status (idx_enrollment_classGroupId_status)
--    - Date range scans (idx_attendance_date, idx_payment_status_dueDate)
--    - User notification inbox (idx_notification_userId_isRead)
-- 2. Covering indexes for critical business logic:
--    - Certificate prerequisite validation: idx_certificate_lookup
-- 3. All FK columns are indexed (InnoDB does this automatically, but explicit
--    naming ensures maintainability and ordering for composite indexes)
-- 4. AuditLog timestamp is DESC for "most recent first" queries
-- 5. JSON columns for flexible data (AuditLog.oldValue/newValue,
--    SystemSetting.value, Notification.data)
-- ============================================================================

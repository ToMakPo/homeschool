DROP DATABASE IF EXISTS homeschool_app;
CREATE DATABASE IF NOT EXISTS homeschool_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE homeschool_app;

CREATE TABLE family (
	id varchar(36) PRIMARY KEY,
	name varchar(255) NOT NULL COMMENT 'The name of the family.',
	createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE user (
	id varchar(36) PRIMARY KEY,
	username varchar(255) NOT NULL UNIQUE,
	hashedPassword varchar(255) NOT NULL COMMENT 'Store hashed password using a secure hashing algorithm.',
	firstName varchar(255) NOT NULL,
	lastName varchar(255) NOT NULL,
	displayName varchar(255) DEFAULT NULL COMMENT 
		'Optional display name for the user. If not provided, the first name will be 
		used as the display name.',
	familyId varchar(36) DEFAULT NULL COMMENT 'The ID of the family the user belongs to. This can be NULL if the user is not part of a family.',
	role ENUM('owner', 'admin', 'parent', 'student') NOT NULL,
	avatarUrl varchar(512) DEFAULT NULL,
	passwordReset BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Indicates whether the user is required to reset their password upon next login.',
	createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	FOREIGN KEY (familyId) REFERENCES family(id) ON DELETE SET NULL
);

CREATE TABLE session (
	id varchar(36) PRIMARY KEY,
	userId varchar(36) NOT NULL,
	authToken TEXT NOT NULL,
	expiresAt DATETIME NOT NULL,
	createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
);

CREATE TABLE subject (
	id varchar(36) PRIMARY KEY,
	familyId varchar(36) NOT NULL,
	name varchar(255) NOT NULL COMMENT 'The name of the subject. For example, "Math" or "Science".',
	icon varchar(255) DEFAULT NULL COMMENT 
		'An optional icon representing the subject. This should be a Google Material 
		Icon name. This will be shown next to the subject name in the UI.',
	description TEXT DEFAULT NULL COMMENT 
		'An optional description of the subject. This can provide additional context 
		or information about the subject.',
	color varchar(255) DEFAULT NULL COMMENT 
		'An optional color associated with the subject. This can be used for UI 
		theming or categorization. The color can be any valid CSS color format, such 
		as hex code (#BADA55), RGB (rgb(255, 0, 0)), named colors (e.g., "goldenrod"), 
		or even a variable such as "--color-primary".',
	createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	FOREIGN KEY (familyId) REFERENCES family(id) ON DELETE CASCADE
);

-- This is the information about an assignment, not the actual assignment work
-- that students will do. The actual work will be tracked in the assignment_group
-- table, which will track the status of the assignment for each group of students.
CREATE TABLE assignment (
	id varchar(36) PRIMARY KEY,
	created_by varchar(36) NOT NULL COMMENT 'The ID of the parent user who created the assignment.',
	subjectId varchar(36) NOT NULL,
	title varchar(255) NOT NULL COMMENT 'The title of the assignment. This should be a brief, descriptive name for the assignment.',
	description TEXT NOT NULL COMMENT 
		'The description of the assignment. This should provide detailed information 
		about the assignment, including any instructions or requirements.',
	due_date DATETIME,
	createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	FOREIGN KEY (created_by) REFERENCES user(id) ON DELETE CASCADE,
	FOREIGN KEY (subjectId) REFERENCES subject(id) ON DELETE CASCADE
);

-- A list of all students who are part of a group for a specific assignment. In
-- most cases, this will be a single student, but if multiple students are working
-- together on an assignment, they will all be part of the same group.
-- This tracks the status of the assignment for the group.
CREATE TABLE assignment_group (
	id varchar(36) PRIMARY KEY,
	assignmentId varchar(36) NOT NULL,
	status ENUM('draft', 'not_started', 'in_progress', 'ready_for_review', 'needs_revision', 'completed') NOT NULL DEFAULT 'not_started' COMMENT '
		-- draft: The assignment is hidden from students (being edited, scheduled pop-quiz, etc.).
		-- not_started: The group has not started working on the assignment yet.
		-- in_progress: The group is currently working on the assignment.
		-- ready_for_review: The group has submitted the assignment for review.
		-- needs_revision: The assignment did not pass the review and needs revision based on feedback.
		-- completed: The assignment has passed review and has been marked as completed.',
	createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	FOREIGN KEY (assignmentId) REFERENCES assignment(id) ON DELETE CASCADE
);

-- A list of all students who are part of a group for a specific assignment. In
-- most cases, a single student will be part of a single group, but if multiple 
-- students are working together on an assignment, they will all be part of the
-- same group.
CREATE TABLE assignment_group_member (
	id varchar(36) PRIMARY KEY,
	groupId varchar(36) NOT NULL,
	studentId varchar(36) NOT NULL,
	createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	FOREIGN KEY (groupId) REFERENCES assignment_group(id) ON DELETE CASCADE,
	FOREIGN KEY (studentId) REFERENCES user(id) ON DELETE CASCADE
);

-- The tasks that are part of an assignment. Each task is a specific piece of work
-- that needs to be completed as part of the assignment. Tasks can be used to
-- break down an assignment into smaller, more manageable pieces. For example, an
-- assignment to "Write a Research Paper" could have tasks like "Choose a Topic",
-- "Conduct Research", "Write Outline", "Write Draft", and "Submit Final Paper".
CREATE TABLE task (
	id varchar(36) PRIMARY KEY,
	assignmentId varchar(36) NOT NULL,
	title varchar(255) NOT NULL COMMENT 'The title of the task. This should be a brief, descriptive name for the task.',
	description TEXT DEFAULT NULL COMMENT 'Optional description of the task. This can provide additional context or information about the task.',
	sort_order INT NOT NULL DEFAULT 0,
	createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	FOREIGN KEY (assignmentId) REFERENCES assignment(id) ON DELETE CASCADE
);

-- The status of a task for a specific group of students. This allows tracking the
-- progress of each task for each group. For example, if a task is "Write Draft", 
-- one group of students may have completed it, while another group may still be
-- working on it. This table allows tracking the status of each task for each group.
-- The group wiii not be able to mark the assignment as ready for review until all
-- tasks are marked as completed.
CREATE TABLE task_status (
	id varchar(36) PRIMARY KEY,
	taskId varchar(36) NOT NULL,
	groupId varchar(36) NOT NULL,
	status ENUM('not_started', 'in_progress', 'completed') NOT NULL DEFAULT 'not_started' COMMENT '
		-- not_started: The group has not started working on the task yet.
		-- in_progress: The group is currently working on the task.
		-- completed: The group has completed the task.',
	createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	FOREIGN KEY (taskId) REFERENCES task(id) ON DELETE CASCADE,
	FOREIGN KEY (groupId) REFERENCES assignment_group(id) ON DELETE CASCADE
);

-- Students and parents can communicate about an assignment through comments. 
-- Comments can be made by parents or students, and are associated with a specific
-- assignment group. This allows for communication and feedback between parents
-- and students about the assignment. The system will also generate comments for
-- certain actions, such as when a student or parent changes the status of a task 
-- or assignment. This allows for a clear record of communication and actions
-- related to the assignment. Comments can also have attachments, such as images
-- or documents, to provide additional context or information.
CREATE TABLE comment (
	id varchar(36) PRIMARY KEY,
	groupId varchar(36) NOT NULL,
	userId varchar(36) DEFAULT NULL COMMENT 'Allows NULL for system-generated comments like "Emma has marked the assignment as completed."',
	content TEXT NOT NULL COMMENT 'The content of the comment. This can be a message, feedback, or any other text related to the assignment.',
	createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	FOREIGN KEY (groupId) REFERENCES assignment_group(id) ON DELETE CASCADE,
	FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
);

-- Attachments can be associated with assignments, tasks, or comments. This allows
-- for files to be uploaded and shared as part of the assignment process. For 
-- example, for example, a parent may upload a PDF of math problems for a student
-- to complete and the student can then upload a PDF of their completed work.
CREATE TABLE attachment (
	id varchar(36) PRIMARY KEY,
	familyId varchar(36) NOT NULL,
	url varchar(512) NOT NULL,
	fileName varchar(255) NOT NULL,
	createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	FOREIGN KEY (familyId) REFERENCES family(id) ON DELETE CASCADE
);

CREATE TABLE assignment_attachment (
	id varchar(36) PRIMARY KEY,
	assignmentId varchar(36) NOT NULL,
	attachmentId varchar(36) NOT NULL,
	createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	FOREIGN KEY (assignmentId) REFERENCES assignment(id) ON DELETE CASCADE,
	FOREIGN KEY (attachmentId) REFERENCES attachment(id) ON DELETE CASCADE
);

CREATE TABLE task_attachment (
	id varchar(36) PRIMARY KEY,
	taskId varchar(36) NOT NULL,
	attachmentId varchar(36) NOT NULL,
	createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	FOREIGN KEY (taskId) REFERENCES task(id) ON DELETE CASCADE,
	FOREIGN KEY (attachmentId) REFERENCES attachment(id) ON DELETE CASCADE
);

CREATE TABLE comment_attachment (
	id varchar(36) PRIMARY KEY,
	commentId varchar(36) NOT NULL,
	attachmentId varchar(36) NOT NULL,
	createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	FOREIGN KEY (commentId) REFERENCES comment(id) ON DELETE CASCADE,
	FOREIGN KEY (attachmentId) REFERENCES attachment(id) ON DELETE CASCADE
);


-- -----------------------
-- --- CREATE TRIGGERS ---
-- -----------------------

DELIMITER $$

CREATE TRIGGER after_assignment_attachment_delete
AFTER DELETE ON assignment_attachment
FOR EACH ROW
BEGIN
    -- Check if the attachment is still used by task or comment
    IF NOT EXISTS (SELECT 1 FROM assignment_attachment WHERE attachmentId = OLD.attachmentId) AND
		NOT EXISTS (SELECT 1 FROM task_attachment WHERE attachmentId = OLD.attachmentId) AND
		NOT EXISTS (SELECT 1 FROM comment_attachment WHERE attachmentId = OLD.attachmentId) THEN
        
        -- If no references exist, delete the orphan attachment
        DELETE FROM attachment WHERE id = OLD.attachmentId;
    END IF;
END$$

CREATE TRIGGER after_task_attachment_delete
AFTER DELETE ON task_attachment
FOR EACH ROW
BEGIN
    IF NOT EXISTS (SELECT 1 FROM assignment_attachment WHERE attachmentId = OLD.attachmentId) AND
		NOT EXISTS (SELECT 1 FROM task_attachment WHERE attachmentId = OLD.attachmentId) AND
		NOT EXISTS (SELECT 1 FROM comment_attachment WHERE attachmentId = OLD.attachmentId) THEN
        
        DELETE FROM attachment WHERE id = OLD.attachmentId;
    END IF;
END$$

CREATE TRIGGER after_comment_attachment_delete
AFTER DELETE ON comment_attachment
FOR EACH ROW
BEGIN
    IF NOT EXISTS (SELECT 1 FROM assignment_attachment WHERE attachmentId = OLD.attachmentId) AND
		NOT EXISTS (SELECT 1 FROM task_attachment WHERE attachmentId = OLD.attachmentId) AND
		NOT EXISTS (SELECT 1 FROM comment_attachment WHERE attachmentId = OLD.attachmentId) THEN
        
        DELETE FROM attachment WHERE id = OLD.attachmentId;
    END IF;
END$$

DELIMITER ;


-- ---------------------
-- --- CREATE EVENTS ---
-- ---------------------

SET GLOBAL event_scheduler = ON;

CREATE EVENT IF NOT EXISTS purge_expired_session
ON SCHEDULE EVERY 1 HOUR
DO
	DELETE FROM session 
	WHERE expiresAt <= NOW();

-- -------------------- 
-- --- CREATE VIEWS ---
-- --------------------

CREATE VIEW view_user AS
SELECT 
	u.id,
	u.username,
	u.firstName,
	u.lastName,
	u.displayName,
	u.familyId,
	u.role, 
    CAST(u.role IN ('student') AS UNSIGNED) AS isStudent,
    CAST(u.role IN ('owner', 'admin', 'parent') AS UNSIGNED) AS isParent,
    CAST(u.role IN ('owner', 'admin') AS UNSIGNED) AS isAdmin,
    CAST(u.role IN ('owner') AS UNSIGNED) AS isOwner,
	u.avatarUrl,
	u.passwordReset,
	u.createdAt
FROM user u;

CREATE INDEX idx_user_familyId ON user(familyId);
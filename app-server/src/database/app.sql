DROP DATABASE IF EXISTS homeschool_app;
CREATE DATABASE IF NOT EXISTS homeschool_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE homeschool_app;

CREATE TABLE user (
	id varchar(36) PRIMARY KEY,
	username varchar(255) NOT NULL UNIQUE,
	hashedPassword varchar(255) NOT NULL,
	firstName varchar(255) NOT NULL,
	lastName varchar(255) NOT NULL,
	displayName varchar(255) DEFAULT NULL,
	role ENUM('parent', 'student') NOT NULL,
	avatarUrl varchar(512) DEFAULT NULL,
	createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE session (
	id varchar(36) PRIMARY KEY,
	userId varchar(36) NOT NULL,
	authToken varchar(255) NOT NULL,
	expiresAt DATETIME NOT NULL,
	createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
);

CREATE TABLE family (
	id varchar(36) PRIMARY KEY,
	name varchar(255) NOT NULL,
	ownerId varchar(36) NOT NULL,
	joinCode varchar(36) NOT NULL UNIQUE,
	createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	FOREIGN KEY (ownerId) REFERENCES user(id) ON DELETE CASCADE
);

CREATE TABLE family_member (
	id varchar(36) PRIMARY KEY,
	familyId varchar(36) NOT NULL,
	userId varchar(36) NOT NULL,
	createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	FOREIGN KEY (familyId) REFERENCES family(id) ON DELETE CASCADE,
	FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
);

CREATE TABLE subject (
	id varchar(36) PRIMARY KEY,
	familyId varchar(36) NOT NULL,
	name varchar(255) NOT NULL,
	icon varchar(255),
	description TEXT,
	color varchar(7),
	createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	FOREIGN KEY (familyId) REFERENCES family(id) ON DELETE CASCADE
);

CREATE TABLE assignment (
	id varchar(36) PRIMARY KEY,
	created_by varchar(36) NOT NULL,
	subjectId varchar(36) NOT NULL,
	title varchar(255) NOT NULL,
	description TEXT,
	due_date DATETIME,
	createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	FOREIGN KEY (created_by) REFERENCES user(id) ON DELETE CASCADE,
	FOREIGN KEY (subjectId) REFERENCES subject(id) ON DELETE CASCADE
);

CREATE TABLE assignment_group (
	id varchar(36) PRIMARY KEY,
	assignmentId varchar(36) NOT NULL,
	createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	FOREIGN KEY (assignmentId) REFERENCES assignment(id) ON DELETE CASCADE
);

CREATE TABLE assignment_group_member (
	id varchar(36) PRIMARY KEY,
	groupId varchar(36) NOT NULL,
	studentId varchar(36) NOT NULL,
	createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	FOREIGN KEY (groupId) REFERENCES assignment_group(id) ON DELETE CASCADE,
	FOREIGN KEY (studentId) REFERENCES user(id) ON DELETE CASCADE
);

CREATE TABLE task (
	id varchar(36) PRIMARY KEY,
	assignmentId varchar(36) NOT NULL,
	title varchar(255) NOT NULL,
	description TEXT,
	sort_order INT NOT NULL DEFAULT 0,
	createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	FOREIGN KEY (assignmentId) REFERENCES assignment(id) ON DELETE CASCADE
);

CREATE TABLE task_status (
	id varchar(36) PRIMARY KEY,
	taskId varchar(36) NOT NULL,
	groupId varchar(36) NOT NULL,
	status ENUM('not_started', 'in_progress', 'completed') NOT NULL DEFAULT 'not_started',
	createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	FOREIGN KEY (taskId) REFERENCES task(id) ON DELETE CASCADE,
	FOREIGN KEY (groupId) REFERENCES assignment_group(id) ON DELETE CASCADE
);

CREATE TABLE comment (
	id varchar(36) PRIMARY KEY,
	groupId varchar(36) NOT NULL,
	userId varchar(36) NOT NULL,
	content TEXT NOT NULL,
	createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	FOREIGN KEY (groupId) REFERENCES assignment_group(id) ON DELETE CASCADE,
	FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
);

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
	u.firstName as firstName,
	u.lastName as lastName,
	u.displayName as displayName,
	u.role,
	u.avatarUrl as avatarUrl
FROM user u;

CREATE VIEW view_family_member AS
SELECT 
	fm.id,
	fm.familyId as familyId,
	fm.userId as userId,
	u.username,
	u.firstName as firstName,
	u.lastName as lastName,
	u.displayName as displayName,
	u.role,
	u.avatarUrl as avatarUrl
FROM family_member fm
JOIN user u ON fm.userId = u.id;
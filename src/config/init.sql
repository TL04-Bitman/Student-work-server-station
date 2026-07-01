CREATE DATABASE IF NOT EXISTS part_time_job CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE part_time_job;

CREATE TABLE IF NOT EXISTS role (
  id INT PRIMARY KEY AUTO_INCREMENT,
  role_name VARCHAR(50) NOT NULL UNIQUE,
  permissions TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO role (role_name, permissions) VALUES 
('student', '{"jobs:read", "applications:create", "applications:read", "settlements:read"}'),
('company', '{"jobs:read", "jobs:create", "jobs:update", "jobs:delete", "applications:read", "applications:update", "settlements:create", "settlements:read"}'),
('admin', '{"*"}');

CREATE TABLE IF NOT EXISTS user (
  id INT PRIMARY KEY AUTO_INCREMENT,
  phone VARCHAR(20) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'student',
  nickname VARCHAR(50),
  company_name VARCHAR(100),
  balance DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_phone (phone),
  INDEX idx_role (role),
  FOREIGN KEY (role) REFERENCES role(role_name)
);

CREATE TABLE IF NOT EXISTS jobs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  type VARCHAR(20) DEFAULT '日结',
  wage DECIMAL(10,2) NOT NULL,
  work_time VARCHAR(200) NOT NULL,
  requirements TEXT,
  location VARCHAR(200),
  company_id INT NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_company_id (company_id),
  INDEX idx_type (type),
  INDEX idx_status (status),
  FOREIGN KEY (company_id) REFERENCES user(id)
);

CREATE TABLE IF NOT EXISTS applications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  job_id INT NOT NULL,
  student_id INT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  work_hours DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_job_id (job_id),
  INDEX idx_student_id (student_id),
  INDEX idx_status (status),
  FOREIGN KEY (job_id) REFERENCES jobs(id),
  FOREIGN KEY (student_id) REFERENCES user(id),
  UNIQUE KEY uk_job_student (job_id, student_id)
);

CREATE TABLE IF NOT EXISTS settlements (
  id INT PRIMARY KEY AUTO_INCREMENT,
  application_id INT NOT NULL UNIQUE,
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (application_id) REFERENCES applications(id)
);
CREATE DATABASE netvision;
USE netvision;

CREATE TABLE devices (

    id INT AUTO_INCREMENT PRIMARY KEY,

    name VARCHAR(100),

    ip VARCHAR(50),

    status VARCHAR(20)

);

INSERT INTO devices
(name,ip,status)

VALUES

('Router','192.168.1.1','Online'),

('AP Lobby','192.168.1.10','Offline'),

('Server','192.168.1.20','Online');
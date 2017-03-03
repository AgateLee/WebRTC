# ************************************************************
# Sequel Pro SQL dump
# Version 4541
#
# http://www.sequelpro.com/
# https://github.com/sequelpro/sequelpro
#
# Host: 10.108.112.178 (MySQL 5.7.17-log)
# Database: webrtc
# Generation Time: 2017-03-03 13:17:20 +0000
# ************************************************************


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


# Dump of table user
# ------------------------------------------------------------

DROP TABLE IF EXISTS `user`;

CREATE TABLE `user` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(64) DEFAULT NULL,
  `passwd` varchar(256) DEFAULT NULL,
  `ip` varchar(64) DEFAULT NULL,
  `port` int(11) DEFAULT NULL,
  `state` int(11) DEFAULT NULL,
  `last_time` date DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

LOCK TABLES `user` WRITE;
/*!40000 ALTER TABLE `user` DISABLE KEYS */;

INSERT INTO `user` (`id`, `name`, `passwd`, `ip`, `port`, `state`, `last_time`)
VALUES
	(1,'alice','7c4a8d09ca3762af61e59520943dc26494f8941b',NULL,NULL,NULL,'2017-03-03'),
	(2,'bob','7c4a8d09ca3762af61e59520943dc26494f8941b',NULL,NULL,NULL,'2017-03-03'),
	(3,'agate','7c4a8d09ca3762af61e59520943dc26494f8941b','',0,0,'2017-03-03'),
	(4,'jack','7c4a8d09ca3762af61e59520943dc26494f8941b','',0,0,'2017-03-03'),
	(5,'frank','7c4a8d09ca3762af61e59520943dc26494f8941b','',0,0,'2017-03-03'),
	(6,'hello','7c4a8d09ca3762af61e59520943dc26494f8941b','',0,0,'2017-03-03'),
	(7,'liyi','7c4a8d09ca3762af61e59520943dc26494f8941b','',0,0,'2017-03-03');

/*!40000 ALTER TABLE `user` ENABLE KEYS */;
UNLOCK TABLES;



/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

-- MySQL dump 10.13  Distrib 5.7.17, for Win64 (x86_64)
--
-- Host: localhost    Database: user_mngt_db
-- ------------------------------------------------------
-- Server version	5.7.17

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `group_users`
--

DROP TABLE IF EXISTS `group_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `group_users` (
  `groupId` int(10) unsigned NOT NULL,
  `userId` int(10) unsigned NOT NULL,
  PRIMARY KEY (`groupId`,`userId`),
  KEY `userId` (`userId`),
  CONSTRAINT `group_users_ibfk_1` FOREIGN KEY (`groupId`) REFERENCES `user_groups` (`id`) ON DELETE CASCADE,
  CONSTRAINT `group_users_ibfk_2` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `group_users`
--

LOCK TABLES `group_users` WRITE;
/*!40000 ALTER TABLE `group_users` DISABLE KEYS */;
INSERT INTO `group_users` VALUES (2,1),(2,2),(1,3),(2,3),(2,4),(2,5),(4,5),(2,6),(4,6),(2,7),(4,7),(1,8),(2,8),(3,8),(4,8),(2,9),(4,9),(2,10),(4,10),(2,11),(4,11),(2,12),(4,12),(2,13),(4,13),(2,14),(4,14),(2,15),(4,15),(2,16),(4,16),(2,17),(2,18),(1,19),(2,19),(2,20),(2,21),(2,22),(2,23),(2,24),(2,25),(2,26),(2,27),(2,28),(2,29),(2,30),(2,31),(2,32),(2,33),(2,34),(2,35),(2,36),(2,37),(2,38),(2,39),(2,40),(2,41);
/*!40000 ALTER TABLE `group_users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_groups`
--

DROP TABLE IF EXISTS `user_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_groups` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(30) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_groups`
--

LOCK TABLES `user_groups` WRITE;
/*!40000 ALTER TABLE `user_groups` DISABLE KEYS */;
INSERT INTO `user_groups` VALUES (1,'admins'),(2,'all users'),(3,'gods'),(4,'subGroup');
/*!40000 ALTER TABLE `user_groups` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(20) NOT NULL,
  `password` varchar(50) NOT NULL,
  `email` varchar(50) NOT NULL,
  `role` varchar(10) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=45 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Chappell_Smithers','1234','Chappell_Smithers@smtp.com','user'),(2,'Merrick_Ashton','1234','Merrick_Ashton@smtp.com','user'),(3,'Ferdel_Clayton','1234','Ferdel_Clayton@smtp.com','admin'),(4,'Blais_Beckwith','1234','Blais_Beckwith@smtp.com','user'),(5,'Achim_Merton','1234','Achim_Merton@smtp.com','user'),(6,'Shane_Hale','1234','Shane_Hale@smtp.com','user'),(7,'Deston_Nottley','1234','Deston_Nottley@smtp.com','user'),(8,'Jarvis_Harrington','1234','Jarvis_Harrington@smtp.com','superadmin'),(9,'Laslo_Soames','1234','Laslo_Soames@smtp.com','user'),(10,'Trever_Smithe','1234','Trever_Smithe@smtp.com','user'),(11,'Jayla_Thorp','1234','Jayla_Thorp@smtp.com','user'),(12,'Oxana_Stonebridge','1234','Oxana_Stonebridge@smtp.com','user'),(13,'Hanrietta_Snape','1234','Hanrietta_Snape@smtp.com','user'),(14,'Rosamonde_Yardley','1234','Rosamonde_Yardley@smtp.com','user'),(15,'Wilma_Bradly','1234','Wilma_Bradly@smtp.com','user'),(16,'Idina_Whitley','1234','Idina_Whitley@smtp.com','user'),(17,'Yolanda_Fletcher','1234','Yolanda_Fletcher@smtp.com','user'),(18,'Madlen_Barrie','1234','Madlen_Barrie@smtp.com','user'),(19,'Eudoxia_Dukes','1234','Eudoxia_Dukes@smtp.com','admin'),(20,'Olivia_Shelby','1234','Olivia_Shelby@smtp.com','user'),(21,'Lyonel_Stansfield','1234','Lyonel_Stansfield@smtp.com','user'),(22,'Oxford_Bradshaw','1234','Oxford_Bradshaw@smtp.com','user'),(23,'Boto_Hamilton','1234','Boto_Hamilton@smtp.com','user'),(24,'Whitlock_Shearman','1234','Whitlock_Shearman@smtp.com','user'),(25,'Alejandro_Burbridge','1234','Alejandro_Burbridge@smtp.com','user'),(26,'Darcel_Hornsby','1234','Darcel_Hornsby@smtp.com','user'),(27,'Walcot_Sampson','1234','Walcot_Sampson@smtp.com','user'),(28,'Erhard_Leighton','1234','Erhard_Leighton@smtp.com','user'),(29,'Jonas_Langley','1234','Jonas_Langley@smtp.com','user'),(30,'Nyle_Reeves','1234','Nyle_Reeves@smtp.com','user'),(31,'Helga_Stonebridge','1234','Helga_Stonebridge@smtp.com','user'),(32,'Tanjura_Ashton','1234','Tanjura_Ashton@smtp.com','user'),(33,'Sascha_Garfield','1234','Sascha_Garfield@smtp.com','user'),(34,'Sharla_Lincoln','1234','Sharla_Lincoln@smtp.com','user'),(35,'Alyssa_Clinton','1234','Alyssa_Clinton@smtp.com','user'),(36,'Isis_Blackwood','1234','Isis_Blackwood@smtp.com','user'),(37,'Ursina_Penney','1234','Ursina_Penney@smtp.com','user'),(38,'Fastrada_Stampes','1234','Fastrada_Stampes@smtp.com','user'),(39,'Gale_Sherman','1234','Gale_Sherman@smtp.com','user'),(40,'Albertyna_Yeardley','1234','Albertyna_Yeardley@smtp.com','user'),(41,'Albertyna_Yeardley','1234','Albertyna_Yeardley@smtp.com','user'),(43,'Mone','1234','mone@smtp.com','user');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2017-07-16 11:29:49

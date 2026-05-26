resource "aws_secretsmanager_secret" "database_url" {
  name                    = "${var.app_name}/database_url"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "database_url" {
  secret_id = aws_secretsmanager_secret.database_url.id
  secret_string = "postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.postgres.endpoint}/${var.db_name}"
}

resource "aws_secretsmanager_secret" "redis_url" {
  name                    = "${var.app_name}/redis_url"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "redis_url" {
  secret_id     = aws_secretsmanager_secret.redis_url.id
  secret_string = "redis://${aws_elasticache_cluster.redis.cache_nodes[0].address}:6379"
}

resource "aws_secretsmanager_secret" "cors_origin" {
  name                    = "${var.app_name}/cors_origin"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "cors_origin" {
  secret_id     = aws_secretsmanager_secret.cors_origin.id
  secret_string = "http://${aws_lb.main.dns_name}"
}

resource "aws_secretsmanager_secret" "kafka_broker" {
  name                    = "${var.app_name}/kafka_broker"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "kafka_broker" {
  secret_id     = aws_secretsmanager_secret.kafka_broker.id
  secret_string = aws_msk_cluster.main.bootstrap_brokers
}

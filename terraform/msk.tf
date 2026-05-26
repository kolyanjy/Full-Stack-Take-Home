resource "aws_msk_configuration" "main" {
  name           = "${var.app_name}-kafka-config"
  kafka_versions = ["3.6.0"]

  server_properties = <<-PROPERTIES
    auto.create.topics.enable=true
    default.replication.factor=1
    min.insync.replicas=1
    num.partitions=1
  PROPERTIES
}

resource "aws_msk_cluster" "main" {
  cluster_name           = "${var.app_name}-kafka"
  kafka_version          = "3.6.0"
  number_of_broker_nodes = 2

  broker_node_group_info {
    instance_type  = "kafka.t3.small"
    client_subnets = aws_subnet.private[*].id

    storage_info {
      ebs_storage_info {
        volume_size = 20
      }
    }

    security_groups = [aws_security_group.msk.id]
  }

  configuration_info {
    arn      = aws_msk_configuration.main.arn
    revision = aws_msk_configuration.main.latest_revision
  }

  encryption_info {
    encryption_in_transit {
      # PLAINTEXT within the VPC — no TLS overhead for internal traffic
      client_broker = "PLAINTEXT"
      in_cluster    = true
    }
  }

  tags = { Name = "${var.app_name}-kafka" }
}

output "app_url" {
  description = "Live application URL"
  value       = "http://${aws_lb.main.dns_name}"
}

output "backend_ecr_url" {
  description = "ECR URL for the backend image"
  value       = aws_ecr_repository.backend.repository_url
}

output "frontend_ecr_url" {
  description = "ECR URL for the frontend image"
  value       = aws_ecr_repository.frontend.repository_url
}

output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.postgres.endpoint
  sensitive   = true
}

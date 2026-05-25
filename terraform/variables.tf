variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "app_name" {
  description = "Short name used to prefix all resources"
  type        = string
  default     = "emissions"
}

variable "db_name" {
  description = "Postgres database name"
  type        = string
  default     = "emissions"
}

variable "db_username" {
  description = "Postgres master username"
  type        = string
  default     = "emissions"
}

variable "db_password" {
  description = "Postgres master password"
  type        = string
  sensitive   = true
}

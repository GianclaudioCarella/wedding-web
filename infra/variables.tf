variable "region" {
  description = "AWS region for the album bucket (pick the closest to the guests)."
  type        = string
}

variable "aws_profile" {
  description = "AWS CLI profile used to run Terraform. Null uses the default credential chain."
  type        = string
  default     = null
}

variable "bucket_name" {
  description = "Globally unique name for the album bucket."
  type        = string
  default     = "giancat-album"
}

variable "allowed_origins" {
  description = "Origins allowed to upload/read directly from the browser (CORS)."
  type        = list(string)
  default = [
    "https://giancat.com",
    "https://www.giancat.com",
    "http://localhost:3000",
  ]
}

variable "enable_versioning" {
  description = "Keep previous versions of objects, protecting against accidental deletes/overwrites."
  type        = bool
  default     = true
}

variable "noncurrent_version_expiration_days" {
  description = "Days to keep deleted/overwritten object versions before purging them."
  type        = number
  default     = 30
}

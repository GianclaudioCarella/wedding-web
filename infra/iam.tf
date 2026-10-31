# Least-privilege user for the Next.js app (Vercel). Only touches the album bucket.

resource "aws_iam_user" "album_app" {
  name = "${var.bucket_name}-app"
}

data "aws_iam_policy_document" "album_app" {
  statement {
    sid       = "AlbumObjects"
    actions   = ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"]
    resources = ["${aws_s3_bucket.album.arn}/*"]
  }

  statement {
    sid       = "AlbumList"
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.album.arn]
  }
}

resource "aws_iam_user_policy" "album_app" {
  name   = "album-bucket-access"
  user   = aws_iam_user.album_app.name
  policy = data.aws_iam_policy_document.album_app.json
}

# Note: the secret ends up in the Terraform state. State is kept local and
# git-ignored; rotate with `terraform apply -replace=aws_iam_access_key.album_app`.
resource "aws_iam_access_key" "album_app" {
  user = aws_iam_user.album_app.name
}

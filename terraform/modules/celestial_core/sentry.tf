# 1. チームの作成 (Engineering チームなど)
resource "sentry_team" "main" {
  organization = var.sentry_org
  name         = "Celestial Engineering${local.suffix}"
  slug         = "engineering${local.suffix}"
}

# 2. Backend (Django) プロジェクト
resource "sentry_project" "backend" {
  organization = sentry_team.main.organization
  teams        = [sentry_team.main.slug]
  name         = "Celestial Biome Backend${local.suffix}"
  slug         = "celestial-biome-backend${local.suffix}"
  platform     = "python-django"
  resolve_age  = 720 # 30日
}

# 3. Frontend (Next.js) プロジェクト
resource "sentry_project" "frontend" {
  organization = sentry_team.main.organization
  teams        = [sentry_team.main.slug]
  name         = "Celestial Biome Frontend${local.suffix}"
  slug         = "celestial-biome-frontend${local.suffix}"
  platform     = "javascript-nextjs"
}

# 4. DSN (Client Key) の参照
# Cloud Run に渡すために、作成されたプロジェクトのキーを取得します
data "sentry_key" "backend" {
  organization = sentry_project.backend.organization
  project      = sentry_project.backend.slug
  first        = true
}

data "sentry_key" "frontend" {
  organization = sentry_project.frontend.organization
  project      = sentry_project.frontend.slug
  first        = true
}

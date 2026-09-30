data "ovh_cloud_project_flavors" "flavor" {
  service_name = var.project_id
  region       = var.region
  name_filter  = var.flavor_name
}

data "ovh_cloud_project_images" "images" {
  service_name = var.project_id
  region       = var.region
  os_type      = "linux"
}

locals {
  debian_image = [
    for img in data.ovh_cloud_project_images.images.images : img
    if img.name == "Debian 13"
  ][0]
}

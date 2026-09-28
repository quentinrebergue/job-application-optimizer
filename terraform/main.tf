resource "local_file" "ansible_inventory" {
  filename = "${path.module}/../ansible/inventory.ini"
  content  = <<-EOT
    [app_servers]
    ${one([for addr in ovh_cloud_project_instance.app_server.addresses : addr.ip if addr.version == 4])} ansible_user=debian
  EOT
}

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

resource "ovh_cloud_project_instance" "app_server" {
  service_name   = var.project_id
  region         = var.region
  billing_period = "hourly"
  name           = "job-optimizer-app"

  flavor {
    flavor_id = one(data.ovh_cloud_project_flavors.flavor.flavors).id
  }

  boot_from {
    image_id = local.debian_image.id
  }

  ssh_key {
    name = "MACBOOK"
  }

  network {
    public = true
  }
}

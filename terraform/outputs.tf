output "instance_ip" {
  description = "Adresse IP publique de l'instance"
  value       = one([for addr in ovh_cloud_project_instance.app_server.addresses : addr.ip if addr.version == 4])
}

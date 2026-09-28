variable "ovh_endpoint" {
  description = "OVH API endpoint (région de ton compte OVH, pas la région de l'instance)"
  type        = string
  default     = "ovh-eu"
}

variable "ovh_application_key" {
  description = "OVH API application key"
  type        = string
  sensitive   = true
}

variable "ovh_application_secret" {
  description = "OVH API application secret"
  type        = string
  sensitive   = true
}

variable "ovh_consumer_key" {
  description = "OVH API consumer key"
  type        = string
  sensitive   = true
}

variable "project_id" {
  description = "ID du projet Public Cloud OVH (service_name)"
  type        = string
}

variable "region" {
  description = "Région OVH Public Cloud pour l'instance"
  type        = string
  default     = "RBX-A"
}

variable "flavor_name" {
  description = "Taille de l'instance"
  type        = string
  default     = "d2-2"
}

variable "ssh_key_public" {
  description = "Contenu de la clé SSH publique (~/.ssh/id_ed25519.pub)"
  type        = string
}

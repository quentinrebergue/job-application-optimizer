resource "ovh_cloud_project_kube" "cluster" {
  service_name = var.project_id
  name         = "job-optimizer-k8s"
  region       = "SBG5"
}

resource "ovh_cloud_project_kube_nodepool" "pool" {
  service_name  = var.project_id
  kube_id       = ovh_cloud_project_kube.cluster.id
  name          = "app-pool"
  flavor_name   = "d2-4"
  desired_nodes = 1
}

resource "local_sensitive_file" "kubeconfig" {
  filename        = "${path.module}/kubeconfig.yaml"
  content         = ovh_cloud_project_kube.cluster.kubeconfig
  file_permission = "0600"
}

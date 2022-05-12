locals {
  namespace = kubernetes_namespace.ns.metadata[0].name
  cr_login_server = "docker.io"
  ####################
  # Name of Services #
  ####################
  svc_gateway = "cp4d-gateway"
  ############
  # Services #
  ############
  # DNS translates hostnames to IP addresses; the container name is the hostname. When using Docker
  # and Docker Compose, DNS works automatically.
  # In K8s, a service makes the deployment accessible by other containers via DNS.
  svc_dns_gateway = "${local.svc_gateway}.${local.namespace}.svc.cluster.local"
}

###############
# Application #
###############
module "cp4d-gateway" {
  # Specify the location of the module, which contains the file main.tf.
  source = "./modules/deployment"
  dir_name = "../../${local.svc_gateway}/gateway"
  app_name = var.app_name
  app_version = var.app_version
  namespace = local.namespace
  replicas = 1
  qos_limits_cpu = "400m"
  qos_limits_memory = "400Mi"
  cr_login_server = local.cr_login_server
  cr_username = var.cr_username
  cr_password = var.cr_password
  # Configure environment variables specific to the mem-gateway.
  # env = {
  #   SVC_DNS_METADATA: local.svc_dns_metadata
  #   SVC_DNS_HISTORY: local.svc_dns_history
  #   SVC_DNS_VIDEO_UPLOAD: local.svc_dns_video_upload
  #   SVC_DNS_VIDEO_STREAMING: local.svc_dns_video_streaming
  #   SVC_DNS_KIBANA: local.svc_dns_kibana
  #   MAX_RETRIES: 20
  # }
  service_name = local.svc_gateway
  service_type = "LoadBalancer"
  service_session_affinity = "None"
}

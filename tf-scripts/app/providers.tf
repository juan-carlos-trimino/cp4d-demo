##################################################
# https://registry.terraform.io/browse/providers #
##################################################

#The ~> operator is a convenient shorthand for allowing only patch releases within a specific minor release.

terraform {
  # Terraform version.
  required_version = ">= 1.0.5"
  required_providers {
    google = {
      source = "hashicorp/google"
      version = ">= 3.5.0"
    }
    #
    kubernetes = {
      source = "hashicorp/kubernetes"
      version = ">= 2.6.1"
    }
    #
    null = {
      source = "hashicorp/null"
      version = ">= 3.1.0"
    }
  }
}

####################################################################################
# Configure the IBM Provider                                                       #
# https://registry.terraform.io/providers/IBM-Cloud/ibm/latest/docs#resource_group #
# https://cloud.ibm.com/iam/overview                                               #
####################################################################################
provider "google" {
  # The credentials require by Terraform to interact with the Google Cloud API.
  # (1) From the menu on the left, click on 'IAM & Admin -> Service Accounts' and create a service
  #     account (click the button '+ CREATE SERVICE ACCOUNT' below the blue row on the top of the
  #     page).
  #
  # or
  #
  # (2) From the menu on the left, click 'APIs & Services -> Credentials'; click the button
  #     '+ CREATE CREDENTIALS' (below the blue row on the top of the page) and select 'Service
  #     account' from the drop down menu.
  #
  # When creating the service account, select the appropriate roles.
  # Project: Owner
  #
  # Finally, when creating a key for the service account, select JSON as the key type.
  # credentials = file("compute-admin-zionbank.json")
  credentials = file("principal-zionbank.json")
  project = var.project_id
  region = var.region
  zone = var.zone
}

########################################################################################################
# https://registry.terraform.io/providers/hashicorp/google/latest/docs/guides/using_gke_with_terraform #
########################################################################################################
provider "kubernetes" {
  host = "https://${data.google_container_cluster.cluster.endpoint}"
  token = data.google_client_config.provider.access_token
  cluster_ca_certificate = base64decode(data.google_container_cluster.cluster.master_auth[0].cluster_ca_certificate)
}

provider "null" {
}

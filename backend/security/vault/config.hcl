# HashiCorp Vault Configuration for NeuroBuildTech
# Centralized secrets management and encryption

# Storage backend - using filesystem for development, use Consul or cloud storage for production
storage "file" {
  path = "/vault/data"
}

# Alternative: Consul storage backend (recommended for production)
# storage "consul" {
#   address = "127.0.0.1:8500"
#   path    = "vault/"
# }

# Alternative: PostgreSQL storage backend
# storage "postgresql" {
#   connection_url = "postgres://vault:vaultpass@postgres:5432/vault?sslmode=require"
# }

# Listener configuration
listener "tcp" {
  address       = "0.0.0.0:8200"
  tls_cert_file = "/vault/certs/vault.crt"
  tls_key_file  = "/vault/certs/vault.key"
  
  # TLS configuration
  tls_min_version = "tls12"
  tls_cipher_suites = [
    "TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256",
    "TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384",
    "TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256",
    "TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384"
  ]
}

# API configuration
api_addr = "https://vault.neurobuildtech.local:8200"
cluster_addr = "https://vault.neurobuildtech.local:8201"

# UI configuration
ui = true

# Telemetry
telemetry {
  prometheus_retention_time = "30s"
  disable_hostname = false
  
  # Statsd configuration (optional)
  # statsd_address = "localhost:8125"
}

# High availability (for production clusters)
# ha_storage "consul" {
#   address = "127.0.0.1:8500"
#   path    = "vault-ha/"
# }

# Seal configuration - Auto-unseal using cloud KMS (recommended for production)
# seal "awskms" {
#   region     = "us-east-1"
#   kms_key_id = "alias/vault-unseal-key"
# }

# seal "gcpckms" {
#   project     = "my-project"
#   region      = "global"
#   key_ring    = "vault"
#   crypto_key  = "vault-key"
# }

# seal "azurekeyvault" {
#   tenant_id      = "tenant-id"
#   client_id      = "client-id"
#   client_secret  = "client-secret"
#   vault_name     = "vault-name"
#   key_name       = "vault-key"
# }

# Plugin directory
plugin_directory = "/vault/plugins"

# Log level
log_level = "info"

# Maximum lease TTL
max_lease_ttl = "768h"

# Default lease TTL
default_lease_ttl = "768h"

# Disable mlock (for containers)
disable_mlock = true

# Disable cache (optional, improves security but reduces performance)
# disable_cache = true

# Cluster name
cluster_name = "neurobuildtech-vault"

# License path (for Vault Enterprise)
# license_path = "/vault/license/vault.hclic"

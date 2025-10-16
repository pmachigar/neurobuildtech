# Vault Admin Policy
# Full access to all Vault operations

# Read system health
path "sys/health" {
  capabilities = ["read", "sudo"]
}

# Manage auth methods
path "auth/*" {
  capabilities = ["create", "read", "update", "delete", "list", "sudo"]
}

# Manage secret engines
path "sys/mounts/*" {
  capabilities = ["create", "read", "update", "delete", "list", "sudo"]
}

# Manage policies
path "sys/policies/*" {
  capabilities = ["create", "read", "update", "delete", "list", "sudo"]
}

# List policies
path "sys/policies/acl" {
  capabilities = ["list"]
}

# List existing policies
path "sys/policies/acl/*" {
  capabilities = ["read", "list"]
}

# Manage tokens
path "auth/token/*" {
  capabilities = ["create", "read", "update", "delete", "list", "sudo"]
}

# Full access to all secrets
path "secret/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

# Full access to KV v2 secrets
path "secret/data/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "secret/metadata/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

# Manage database secrets engine
path "database/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

# Manage PKI secrets engine
path "pki/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

# Manage transit encryption
path "transit/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

# Manage audit devices
path "sys/audit/*" {
  capabilities = ["create", "read", "update", "delete", "list", "sudo"]
}

# View capabilities
path "sys/capabilities" {
  capabilities = ["create", "update"]
}

path "sys/capabilities-self" {
  capabilities = ["create", "update"]
}

# Manage leases
path "sys/leases/*" {
  capabilities = ["create", "read", "update", "delete", "list", "sudo"]
}

# Seal/Unseal operations
path "sys/seal" {
  capabilities = ["create", "update", "sudo"]
}

path "sys/unseal" {
  capabilities = ["create", "update", "sudo"]
}

# Manage internal UI
path "sys/internal/ui/*" {
  capabilities = ["read"]
}

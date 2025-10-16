# Vault Application Policy
# Read-only access to application secrets

# Read application secrets
path "secret/data/neurobuildtech/app/*" {
  capabilities = ["read", "list"]
}

path "secret/metadata/neurobuildtech/app/*" {
  capabilities = ["read", "list"]
}

# Read database credentials
path "database/creds/app-role" {
  capabilities = ["read"]
}

# Read API keys
path "secret/data/neurobuildtech/api-keys/*" {
  capabilities = ["read"]
}

# Transit encryption for application data
path "transit/encrypt/neurobuildtech-app" {
  capabilities = ["update"]
}

path "transit/decrypt/neurobuildtech-app" {
  capabilities = ["update"]
}

# Generate certificates from PKI
path "pki/issue/neurobuildtech-app" {
  capabilities = ["create", "update"]
}

# Read own token
path "auth/token/lookup-self" {
  capabilities = ["read"]
}

# Renew own token
path "auth/token/renew-self" {
  capabilities = ["update"]
}

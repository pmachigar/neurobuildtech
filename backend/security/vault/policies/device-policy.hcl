# Vault Device Policy
# Limited access for IoT devices

# Read device-specific secrets
path "secret/data/neurobuildtech/devices/+/config" {
  capabilities = ["read"]
}

# Write device telemetry (if using Vault for storage)
path "secret/data/neurobuildtech/devices/+/telemetry" {
  capabilities = ["create", "update"]
}

# Device certificates
path "pki/issue/device-role" {
  capabilities = ["create", "update"]
}

# Transit encryption for device data
path "transit/encrypt/device-data" {
  capabilities = ["update"]
}

# Read own token
path "auth/token/lookup-self" {
  capabilities = ["read"]
}

# Renew own token
path "auth/token/renew-self" {
  capabilities = ["update"]
}

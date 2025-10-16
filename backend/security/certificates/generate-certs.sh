#!/bin/bash
# Certificate Generation Script for Device Authentication
# Generates X.509 certificates for device authentication and mTLS

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CA_DIR="${SCRIPT_DIR}/ca"
CERTS_DIR="${SCRIPT_DIR}/devices"
VALIDITY_DAYS=365

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Create necessary directories
mkdir -p "${CA_DIR}" "${CERTS_DIR}"

# Function to generate CA certificate
generate_ca() {
    log_info "Generating Certificate Authority (CA)..."
    
    if [ -f "${CA_DIR}/ca.key" ]; then
        log_warn "CA key already exists. Skipping CA generation."
        return
    fi
    
    # Generate CA private key
    openssl genrsa -out "${CA_DIR}/ca.key" 4096
    
    # Generate CA certificate
    openssl req -new -x509 -days $((VALIDITY_DAYS * 10)) -key "${CA_DIR}/ca.key" \
        -out "${CA_DIR}/ca.crt" \
        -subj "/C=US/ST=State/L=City/O=NeuroBuildTech/OU=IoT/CN=NeuroBuildTech Root CA"
    
    log_info "CA certificate generated successfully"
}

# Function to generate device certificate
generate_device_cert() {
    local device_id=$1
    
    if [ -z "$device_id" ]; then
        log_error "Device ID is required"
        return 1
    fi
    
    log_info "Generating certificate for device: ${device_id}"
    
    local device_dir="${CERTS_DIR}/${device_id}"
    mkdir -p "${device_dir}"
    
    # Generate device private key
    openssl genrsa -out "${device_dir}/device.key" 2048
    
    # Generate certificate signing request (CSR)
    openssl req -new -key "${device_dir}/device.key" \
        -out "${device_dir}/device.csr" \
        -subj "/C=US/ST=State/L=City/O=NeuroBuildTech/OU=Devices/CN=${device_id}"
    
    # Sign the certificate with CA
    openssl x509 -req -in "${device_dir}/device.csr" \
        -CA "${CA_DIR}/ca.crt" -CAkey "${CA_DIR}/ca.key" \
        -CAcreateserial -out "${device_dir}/device.crt" \
        -days ${VALIDITY_DAYS} -sha256
    
    # Create certificate bundle
    cat "${device_dir}/device.crt" "${CA_DIR}/ca.crt" > "${device_dir}/bundle.crt"
    
    # Set proper permissions
    chmod 600 "${device_dir}/device.key"
    chmod 644 "${device_dir}/device.crt"
    
    log_info "Device certificate generated: ${device_dir}/device.crt"
}

# Function to verify certificate
verify_cert() {
    local cert_path=$1
    
    if [ ! -f "$cert_path" ]; then
        log_error "Certificate not found: ${cert_path}"
        return 1
    fi
    
    log_info "Verifying certificate: ${cert_path}"
    openssl verify -CAfile "${CA_DIR}/ca.crt" "$cert_path"
}

# Function to revoke certificate
revoke_cert() {
    local device_id=$1
    local device_dir="${CERTS_DIR}/${device_id}"
    
    if [ ! -d "$device_dir" ]; then
        log_error "Device certificate not found: ${device_id}"
        return 1
    fi
    
    log_info "Revoking certificate for device: ${device_id}"
    
    # Create CRL (Certificate Revocation List) if not exists
    if [ ! -f "${CA_DIR}/crl.pem" ]; then
        touch "${CA_DIR}/index.txt"
        echo "1000" > "${CA_DIR}/serial"
        openssl ca -config <(cat <<EOF
[ ca ]
default_ca = CA_default

[ CA_default ]
dir = ${CA_DIR}
database = ${CA_DIR}/index.txt
serial = ${CA_DIR}/serial
certificate = ${CA_DIR}/ca.crt
private_key = ${CA_DIR}/ca.key
default_md = sha256
policy = policy_anything

[ policy_anything ]
countryName = optional
stateOrProvinceName = optional
organizationName = optional
organizationalUnitName = optional
commonName = supplied
emailAddress = optional
EOF
        ) -gencrl -out "${CA_DIR}/crl.pem"
    fi
    
    # Move certificate to revoked directory
    mkdir -p "${CERTS_DIR}/revoked"
    mv "${device_dir}" "${CERTS_DIR}/revoked/${device_id}"
    
    log_info "Certificate revoked successfully"
}

# Main script logic
case "${1:-}" in
    init)
        generate_ca
        ;;
    generate)
        if [ -z "$2" ]; then
            log_error "Usage: $0 generate <device-id>"
            exit 1
        fi
        generate_ca
        generate_device_cert "$2"
        ;;
    verify)
        if [ -z "$2" ]; then
            log_error "Usage: $0 verify <cert-path>"
            exit 1
        fi
        verify_cert "$2"
        ;;
    revoke)
        if [ -z "$2" ]; then
            log_error "Usage: $0 revoke <device-id>"
            exit 1
        fi
        revoke_cert "$2"
        ;;
    *)
        echo "Certificate Management Tool"
        echo ""
        echo "Usage: $0 {init|generate|verify|revoke} [options]"
        echo ""
        echo "Commands:"
        echo "  init              Initialize CA certificate"
        echo "  generate <id>     Generate device certificate"
        echo "  verify <path>     Verify certificate"
        echo "  revoke <id>       Revoke device certificate"
        echo ""
        exit 1
        ;;
esac

exit 0

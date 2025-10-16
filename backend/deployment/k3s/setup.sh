#!/bin/bash
# K3s Cluster Setup Script for Raspberry Pi 5B Cluster
# This script helps automate the deployment of K3s on Raspberry Pi nodes

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
MASTER_NODE=${MASTER_NODE:-""}
WORKER_NODES=${WORKER_NODES:-""}
K3S_VERSION=${K3S_VERSION:-"v1.28.5+k3s1"}

print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    print_info "Checking prerequisites..."
    
    # Check if running on ARM64
    if [ "$(uname -m)" != "aarch64" ]; then
        print_warn "This script is optimized for ARM64 (aarch64) architecture"
    fi
    
    # Check if running as root
    if [ "$EUID" -ne 0 ]; then
        print_error "This script must be run as root (use sudo)"
        exit 1
    fi
    
    print_info "Prerequisites check completed"
}

install_master() {
    print_info "Installing K3s master node..."
    
    # Disable swap (required for Kubernetes)
    print_info "Disabling swap..."
    dphys-swapfile swapoff || true
    dphys-swapfile uninstall || true
    systemctl disable dphys-swapfile || true
    
    # Enable cgroup memory and cpu
    print_info "Configuring boot parameters..."
    if ! grep -q "cgroup_memory=1 cgroup_enable=memory" /boot/cmdline.txt; then
        sed -i '$ s/$/ cgroup_memory=1 cgroup_enable=memory/' /boot/cmdline.txt
        print_warn "Boot parameters updated. Reboot required after installation."
    fi
    
    # Install K3s
    print_info "Installing K3s ${K3S_VERSION}..."
    curl -sfL https://get.k3s.io | INSTALL_K3S_VERSION=${K3S_VERSION} sh -s - server \
        --write-kubeconfig-mode 644 \
        --disable traefik \
        --disable servicelb \
        --node-taint node-role.kubernetes.io/master=true:NoSchedule
    
    # Wait for K3s to be ready
    print_info "Waiting for K3s to be ready..."
    sleep 10
    
    # Get node token
    NODE_TOKEN=$(cat /var/lib/rancher/k3s/server/node-token)
    print_info "K3s master node installed successfully!"
    print_info "Node Token: ${NODE_TOKEN}"
    print_info "Save this token for joining worker nodes"
    
    # Save token to file
    echo "${NODE_TOKEN}" > /tmp/k3s-node-token
    
    # Display cluster info
    kubectl get nodes
}

install_worker() {
    print_info "Installing K3s worker node..."
    
    if [ -z "${MASTER_NODE}" ]; then
        print_error "MASTER_NODE environment variable is required"
        exit 1
    fi
    
    if [ -z "${K3S_TOKEN}" ]; then
        print_error "K3S_TOKEN environment variable is required"
        exit 1
    fi
    
    # Disable swap
    print_info "Disabling swap..."
    dphys-swapfile swapoff || true
    dphys-swapfile uninstall || true
    systemctl disable dphys-swapfile || true
    
    # Enable cgroup memory and cpu
    print_info "Configuring boot parameters..."
    if ! grep -q "cgroup_memory=1 cgroup_enable=memory" /boot/cmdline.txt; then
        sed -i '$ s/$/ cgroup_memory=1 cgroup_enable=memory/' /boot/cmdline.txt
        print_warn "Boot parameters updated. Reboot required after installation."
    fi
    
    # Install K3s agent
    print_info "Installing K3s agent ${K3S_VERSION}..."
    curl -sfL https://get.k3s.io | INSTALL_K3S_VERSION=${K3S_VERSION} K3S_URL=https://${MASTER_NODE}:6443 K3S_TOKEN=${K3S_TOKEN} sh -
    
    print_info "K3s worker node installed successfully!"
}

uninstall_k3s() {
    print_info "Uninstalling K3s..."
    
    if [ -f /usr/local/bin/k3s-uninstall.sh ]; then
        /usr/local/bin/k3s-uninstall.sh
    elif [ -f /usr/local/bin/k3s-agent-uninstall.sh ]; then
        /usr/local/bin/k3s-agent-uninstall.sh
    else
        print_warn "No K3s installation found"
    fi
    
    print_info "K3s uninstalled"
}

show_usage() {
    cat << EOF
Usage: $0 [command]

Commands:
    master      Install K3s as master node
    worker      Install K3s as worker node (requires MASTER_NODE and K3S_TOKEN env vars)
    uninstall   Uninstall K3s from this node
    help        Show this help message

Environment Variables:
    MASTER_NODE     IP or hostname of the master node (required for worker)
    K3S_TOKEN       Token from master node (required for worker)
    K3S_VERSION     K3s version to install (default: ${K3S_VERSION})

Examples:
    # Install master node
    sudo ./setup.sh master
    
    # Install worker node
    sudo MASTER_NODE=192.168.1.100 K3S_TOKEN=K10xxx ./setup.sh worker
    
    # Uninstall
    sudo ./setup.sh uninstall

EOF
}

# Main
case "${1}" in
    master)
        check_prerequisites
        install_master
        ;;
    worker)
        check_prerequisites
        install_worker
        ;;
    uninstall)
        uninstall_k3s
        ;;
    help|--help|-h)
        show_usage
        ;;
    *)
        print_error "Invalid command"
        show_usage
        exit 1
        ;;
esac

#!/bin/bash
# Disk Encryption Script for M.2 SSDs using LUKS
# Implements encryption at rest for data security

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
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

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "This script must be run as root"
        exit 1
    fi
}

# Check if cryptsetup is installed
check_dependencies() {
    if ! command -v cryptsetup &> /dev/null; then
        log_error "cryptsetup is not installed. Install it with: apt-get install cryptsetup"
        exit 1
    fi
}

# List available disks
list_disks() {
    log_info "Available disks:"
    lsblk -d -o NAME,SIZE,TYPE,MOUNTPOINT | grep -v "loop"
}

# Setup LUKS encryption on a device
setup_encryption() {
    local device=$1
    local name=$2
    
    if [ -z "$device" ] || [ -z "$name" ]; then
        log_error "Usage: setup_encryption <device> <name>"
        return 1
    fi
    
    if [ ! -b "$device" ]; then
        log_error "Device $device does not exist"
        return 1
    fi
    
    log_warn "WARNING: This will destroy all data on $device"
    read -p "Are you sure you want to continue? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        log_info "Operation cancelled"
        return 0
    fi
    
    log_step "Securely wiping device $device..."
    dd if=/dev/zero of="$device" bs=1M count=10 status=progress
    
    log_step "Setting up LUKS encryption on $device..."
    cryptsetup luksFormat "$device" --type luks2 \
        --cipher aes-xts-plain64 \
        --key-size 512 \
        --hash sha256 \
        --iter-time 2000 \
        --use-random
    
    log_step "Opening encrypted device..."
    cryptsetup open "$device" "$name"
    
    log_step "Creating filesystem..."
    mkfs.ext4 -L "$name" "/dev/mapper/$name"
    
    log_info "Encryption setup complete for $device"
    log_info "Encrypted device is available at: /dev/mapper/$name"
}

# Open encrypted device
open_encrypted() {
    local device=$1
    local name=$2
    
    if [ -z "$device" ] || [ -z "$name" ]; then
        log_error "Usage: open_encrypted <device> <name>"
        return 1
    fi
    
    log_step "Opening encrypted device $device as $name..."
    cryptsetup open "$device" "$name"
    
    log_info "Encrypted device opened at: /dev/mapper/$name"
}

# Close encrypted device
close_encrypted() {
    local name=$1
    
    if [ -z "$name" ]; then
        log_error "Usage: close_encrypted <name>"
        return 1
    fi
    
    log_step "Closing encrypted device $name..."
    
    # Unmount if mounted
    if mount | grep -q "/dev/mapper/$name"; then
        log_step "Unmounting device..."
        umount "/dev/mapper/$name"
    fi
    
    cryptsetup close "$name"
    
    log_info "Encrypted device $name closed"
}

# Mount encrypted device
mount_encrypted() {
    local name=$1
    local mountpoint=$2
    
    if [ -z "$name" ] || [ -z "$mountpoint" ]; then
        log_error "Usage: mount_encrypted <name> <mountpoint>"
        return 1
    fi
    
    if [ ! -d "$mountpoint" ]; then
        log_step "Creating mount point $mountpoint..."
        mkdir -p "$mountpoint"
    fi
    
    log_step "Mounting encrypted device $name to $mountpoint..."
    mount "/dev/mapper/$name" "$mountpoint"
    
    log_info "Encrypted device mounted at: $mountpoint"
}

# Add key to LUKS device (for key rotation)
add_key() {
    local device=$1
    
    if [ -z "$device" ]; then
        log_error "Usage: add_key <device>"
        return 1
    fi
    
    log_step "Adding new key to $device..."
    cryptsetup luksAddKey "$device"
    
    log_info "New key added successfully"
}

# Remove key from LUKS device
remove_key() {
    local device=$1
    
    if [ -z "$device" ]; then
        log_error "Usage: remove_key <device>"
        return 1
    fi
    
    log_step "Removing key from $device..."
    cryptsetup luksRemoveKey "$device"
    
    log_info "Key removed successfully"
}

# Backup LUKS header
backup_header() {
    local device=$1
    local backup_file=$2
    
    if [ -z "$device" ] || [ -z "$backup_file" ]; then
        log_error "Usage: backup_header <device> <backup_file>"
        return 1
    fi
    
    log_step "Backing up LUKS header from $device..."
    cryptsetup luksHeaderBackup "$device" --header-backup-file "$backup_file"
    
    # Set restrictive permissions on backup file
    chmod 600 "$backup_file"
    
    log_info "LUKS header backed up to: $backup_file"
    log_warn "Keep this backup in a secure location!"
}

# Restore LUKS header
restore_header() {
    local device=$1
    local backup_file=$2
    
    if [ -z "$device" ] || [ -z "$backup_file" ]; then
        log_error "Usage: restore_header <device> <backup_file>"
        return 1
    fi
    
    if [ ! -f "$backup_file" ]; then
        log_error "Backup file not found: $backup_file"
        return 1
    fi
    
    log_warn "WARNING: This will replace the LUKS header on $device"
    read -p "Are you sure you want to continue? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        log_info "Operation cancelled"
        return 0
    fi
    
    log_step "Restoring LUKS header to $device..."
    cryptsetup luksHeaderRestore "$device" --header-backup-file "$backup_file"
    
    log_info "LUKS header restored successfully"
}

# Show LUKS device status
show_status() {
    local device=$1
    
    if [ -z "$device" ]; then
        log_error "Usage: show_status <device>"
        return 1
    fi
    
    log_info "LUKS device status for $device:"
    cryptsetup luksDump "$device"
}

# Auto-mount configuration
configure_automount() {
    local device=$1
    local name=$2
    local mountpoint=$3
    local keyfile=$4
    
    if [ -z "$device" ] || [ -z "$name" ] || [ -z "$mountpoint" ]; then
        log_error "Usage: configure_automount <device> <name> <mountpoint> [keyfile]"
        return 1
    fi
    
    # Add to /etc/crypttab
    log_step "Adding entry to /etc/crypttab..."
    if [ -n "$keyfile" ]; then
        echo "$name $device $keyfile luks" >> /etc/crypttab
    else
        echo "$name $device none luks" >> /etc/crypttab
    fi
    
    # Add to /etc/fstab
    log_step "Adding entry to /etc/fstab..."
    echo "/dev/mapper/$name $mountpoint ext4 defaults 0 2" >> /etc/fstab
    
    log_info "Auto-mount configured. Device will be mounted at boot."
}

# Main script logic
check_root
check_dependencies

case "${1:-}" in
    list)
        list_disks
        ;;
    setup)
        if [ -z "$2" ] || [ -z "$3" ]; then
            log_error "Usage: $0 setup <device> <name>"
            exit 1
        fi
        setup_encryption "$2" "$3"
        ;;
    open)
        if [ -z "$2" ] || [ -z "$3" ]; then
            log_error "Usage: $0 open <device> <name>"
            exit 1
        fi
        open_encrypted "$2" "$3"
        ;;
    close)
        if [ -z "$2" ]; then
            log_error "Usage: $0 close <name>"
            exit 1
        fi
        close_encrypted "$2"
        ;;
    mount)
        if [ -z "$2" ] || [ -z "$3" ]; then
            log_error "Usage: $0 mount <name> <mountpoint>"
            exit 1
        fi
        mount_encrypted "$2" "$3"
        ;;
    add-key)
        if [ -z "$2" ]; then
            log_error "Usage: $0 add-key <device>"
            exit 1
        fi
        add_key "$2"
        ;;
    remove-key)
        if [ -z "$2" ]; then
            log_error "Usage: $0 remove-key <device>"
            exit 1
        fi
        remove_key "$2"
        ;;
    backup-header)
        if [ -z "$2" ] || [ -z "$3" ]; then
            log_error "Usage: $0 backup-header <device> <backup_file>"
            exit 1
        fi
        backup_header "$2" "$3"
        ;;
    restore-header)
        if [ -z "$2" ] || [ -z "$3" ]; then
            log_error "Usage: $0 restore-header <device> <backup_file>"
            exit 1
        fi
        restore_header "$2" "$3"
        ;;
    status)
        if [ -z "$2" ]; then
            log_error "Usage: $0 status <device>"
            exit 1
        fi
        show_status "$2"
        ;;
    automount)
        if [ -z "$2" ] || [ -z "$3" ] || [ -z "$4" ]; then
            log_error "Usage: $0 automount <device> <name> <mountpoint> [keyfile]"
            exit 1
        fi
        configure_automount "$2" "$3" "$4" "$5"
        ;;
    *)
        echo "Disk Encryption Tool"
        echo ""
        echo "Usage: $0 {command} [options]"
        echo ""
        echo "Commands:"
        echo "  list                              List available disks"
        echo "  setup <device> <name>             Setup LUKS encryption"
        echo "  open <device> <name>              Open encrypted device"
        echo "  close <name>                      Close encrypted device"
        echo "  mount <name> <mountpoint>         Mount encrypted device"
        echo "  add-key <device>                  Add encryption key"
        echo "  remove-key <device>               Remove encryption key"
        echo "  backup-header <device> <file>     Backup LUKS header"
        echo "  restore-header <device> <file>    Restore LUKS header"
        echo "  status <device>                   Show device status"
        echo "  automount <device> <name> <mp>    Configure auto-mount"
        echo ""
        echo "Examples:"
        echo "  $0 list"
        echo "  $0 setup /dev/nvme0n1 encrypted-data"
        echo "  $0 open /dev/nvme0n1 encrypted-data"
        echo "  $0 mount encrypted-data /mnt/secure"
        echo ""
        exit 1
        ;;
esac

exit 0

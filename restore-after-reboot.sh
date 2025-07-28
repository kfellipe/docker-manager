#!/bin/bash
# filepath: /root/Documents/docker-manager/restore-after-reboot.sh

echo "🔄 Iniciando restauração após reboot..."

# Diretório base do docker-manager
DOCKER_MANAGER_DIR="/root/Documents/docker-manager"
INTERFACE_CONTROL_FILE="$DOCKER_MANAGER_DIR/container/interface_control.json"
LOG_FILE="/var/log/docker-manager/restore.log"

# Função para log
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Verifica se o arquivo de controle existe
if [ ! -f "$INTERFACE_CONTROL_FILE" ]; then
    log "❌ Arquivo interface_control.json não encontrado em $INTERFACE_CONTROL_FILE"
    exit 1
fi

log "📋 Arquivo de controle encontrado, iniciando restauração..."

# Aguarda um pouco para garantir que o sistema esteja estável
sleep 10

# Chama o script Python para fazer a restauração
cd "$DOCKER_MANAGER_DIR"
python3 restore_containers.py

log "🏁 Processo de restauração concluído!"
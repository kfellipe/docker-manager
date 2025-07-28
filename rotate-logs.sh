#!/bin/bash

# Script para rotação de logs do docker-manager
# Deve ser executado via cron, por exemplo: 0 2 * * * /root/Documents/docker-manager/rotate-logs.sh

LOG_FILE="/var/log/docker-manager.log"
LOG_DIR="/var/log"
MAX_SIZE=100MB  # Tamanho máximo do arquivo de log
BACKUP_COUNT=5  # Quantidade de backups a manter

# Função para log com timestamp
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - [LOG-ROTATE] $1" >> "$LOG_FILE"
}

# Verifica se o arquivo de log existe
if [ ! -f "$LOG_FILE" ]; then
    echo "Arquivo de log não encontrado: $LOG_FILE"
    exit 1
fi

# Verifica o tamanho do arquivo
FILE_SIZE=$(stat -c%s "$LOG_FILE")
MAX_SIZE_BYTES=$((100 * 1024 * 1024))  # 100MB em bytes

if [ "$FILE_SIZE" -gt "$MAX_SIZE_BYTES" ]; then
    log_message "Iniciando rotação de logs - Arquivo atual: ${FILE_SIZE} bytes"
    
    # Rotaciona os logs existentes
    for i in $(seq $((BACKUP_COUNT-1)) -1 1); do
        if [ -f "${LOG_FILE}.${i}" ]; then
            mv "${LOG_FILE}.${i}" "${LOG_FILE}.$((i+1))"
        fi
    done
    
    # Move o log atual para .1
    mv "$LOG_FILE" "${LOG_FILE}.1"
    
    # Cria novo arquivo de log
    touch "$LOG_FILE"
    chown root:root "$LOG_FILE"
    chmod 644 "$LOG_FILE"
    
    # Remove logs antigos além do limite
    if [ -f "${LOG_FILE}.$((BACKUP_COUNT+1))" ]; then
        rm "${LOG_FILE}.$((BACKUP_COUNT+1))"
    fi
    
    log_message "Rotação de logs concluída"
else
    log_message "Arquivo de log ainda dentro do limite: ${FILE_SIZE} bytes"
fi

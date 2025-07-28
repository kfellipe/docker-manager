#!/bin/bash

# Configuração de logs para docker-manager
LOG_FILE="/var/log/docker-manager/docker-manager.log"
LOG_DIR="/var/log/docker-manager"

# Cria o diretório de logs se não existir
if [ ! -d "$LOG_DIR" ]; then
    mkdir -p "$LOG_DIR"
fi

# Cria o arquivo de log se não existir
if [ ! -f "$LOG_FILE" ]; then
    touch "$LOG_FILE"
fi

# Função para log com timestamp
log_with_timestamp() {
    while IFS= read -r line; do
        echo "$(date '+%Y-%m-%d %H:%M:%S') - $line" >> "$LOG_FILE"
    done
}

# Navega para o diretório do projeto
cd /root/Documents/docker-manager/

# Ativa o ambiente virtual
source venv/bin/activate

# Log de início do serviço
echo "$(date '+%Y-%m-%d %H:%M:%S') - [INFO] Iniciando serviço docker-manager..." >> "$LOG_FILE"

# Inicia o servidor Django com redirecionamento de logs
python3 manage.py runserver 0.0.0.0:8000

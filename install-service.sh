#!/bin/bash

# Script para instalar e configurar o serviço docker-manager

SERVICE_NAME="docker-manager"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
PROJECT_DIR="/root/Documents/docker-manager"
LOG_FILE="/var/log/docker-manager.log"

echo "=== Instalação do Serviço Docker Manager ==="

# Verifica se está rodando como root
if [ "$EUID" -ne 0 ]; then
    echo "Este script deve ser executado como root"
    exit 1
fi

# Cria o diretório de logs se não existir
echo "Criando diretório de logs..."
mkdir -p /var/log
touch "$LOG_FILE"
chmod 644 "$LOG_FILE"

# Copia o arquivo de serviço para o systemd
echo "Instalando arquivo de serviço..."
cp "${PROJECT_DIR}/docker-manager.service" "$SERVICE_FILE"

# Recarrega o systemd
echo "Recarregando systemd..."
systemctl daemon-reload

# Ativa o serviço
echo "Ativando serviço..."
systemctl enable "$SERVICE_NAME"

# Instala o script de rotação de logs no cron
echo "Configurando rotação de logs..."
CRON_LINE="0 2 * * * ${PROJECT_DIR}/rotate-logs.sh"
(crontab -l 2>/dev/null; echo "$CRON_LINE") | crontab -

echo ""
echo "=== Instalação Concluída ==="
echo "Comandos disponíveis:"
echo "  systemctl start $SERVICE_NAME     - Iniciar serviço"
echo "  systemctl stop $SERVICE_NAME      - Parar serviço"
echo "  systemctl restart $SERVICE_NAME   - Reiniciar serviço"
echo "  systemctl status $SERVICE_NAME    - Status do serviço"
echo "  ${PROJECT_DIR}/monitor-logs.sh    - Monitorar logs"
echo "  ${PROJECT_DIR}/test-logging.sh    - Testar sistema de logs"
echo ""
echo "Logs disponíveis em: $LOG_FILE"
echo ""

# Testa o sistema de logging
echo "Testando sistema de logging..."
${PROJECT_DIR}/test-logging.sh

echo ""

# Pergunta se deseja iniciar o serviço agora
read -p "Deseja iniciar o serviço agora? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Iniciando serviço..."
    systemctl start "$SERVICE_NAME"
    sleep 2
    systemctl status "$SERVICE_NAME"
fi

#!/bin/bash

# Script para monitorar logs do docker-manager em tempo real
# Uso: ./monitor-logs.sh [opções]

LOG_FILE="/var/log/docker-manager.log"

# Função para exibir ajuda
show_help() {
    cat << EOF
Monitor de Logs do Docker Manager

Uso: $0 [opções]

Opções:
    -f, --follow         Acompanha o arquivo de log em tempo real (padrão)
    -t, --tail NUM       Exibe as últimas NUM linhas (padrão: 50)
    -g, --grep PATTERN   Filtra logs por padrão
    -e, --error          Exibe apenas logs de erro
    -w, --warning        Exibe apenas logs de warning
    -i, --info           Exibe apenas logs de info
    -d, --debug          Exibe apenas logs de debug
    -h, --help           Exibe esta ajuda

Exemplos:
    $0                          # Monitora logs em tempo real
    $0 -t 100                   # Exibe últimas 100 linhas
    $0 -g "container"           # Filtra por "container"
    $0 -e                       # Apenas erros
    $0 -g "docker" -f           # Filtra por "docker" e acompanha
EOF
}

# Configurações padrão
FOLLOW=true
TAIL_LINES=50
GREP_PATTERN=""
LEVEL_FILTER=""

# Processa argumentos
while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--follow)
            FOLLOW=true
            shift
            ;;
        -t|--tail)
            TAIL_LINES="$2"
            shift 2
            ;;
        -g|--grep)
            GREP_PATTERN="$2"
            shift 2
            ;;
        -e|--error)
            LEVEL_FILTER="ERROR"
            shift
            ;;
        -w|--warning)
            LEVEL_FILTER="WARNING"
            shift
            ;;
        -i|--info)
            LEVEL_FILTER="INFO"
            shift
            ;;
        -d|--debug)
            LEVEL_FILTER="DEBUG"
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo "Opção desconhecida: $1"
            show_help
            exit 1
            ;;
    esac
done

# Verifica se o arquivo de log existe
if [ ! -f "$LOG_FILE" ]; then
    echo "Arquivo de log não encontrado: $LOG_FILE"
    echo "Certifique-se de que o docker-manager está rodando."
    exit 1
fi

# Constrói o comando
CMD="tail"

if [ "$FOLLOW" = true ]; then
    CMD="$CMD -f"
fi

CMD="$CMD -n $TAIL_LINES $LOG_FILE"

# Adiciona filtros se especificados
if [ -n "$LEVEL_FILTER" ]; then
    CMD="$CMD | grep '$LEVEL_FILTER'"
fi

if [ -n "$GREP_PATTERN" ]; then
    CMD="$CMD | grep '$GREP_PATTERN'"
fi

# Adiciona colorização para melhor legibilidade
CMD="$CMD | sed 's/ERROR/\x1b[31mERROR\x1b[0m/g' | sed 's/WARNING/\x1b[33mWARNING\x1b[0m/g' | sed 's/INFO/\x1b[32mINFO\x1b[0m/g' | sed 's/DEBUG/\x1b[36mDEBUG\x1b[0m/g'"

echo "Monitorando logs do Docker Manager..."
echo "Arquivo: $LOG_FILE"
echo "Pressione Ctrl+C para sair"
echo "----------------------------------------"

# Executa o comando
eval $CMD

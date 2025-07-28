#!/usr/bin/env python3
# filepath: /root/Documents/docker-manager/restore_containers.py

import json
import docker
import time
import logging
import sys
import os

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/docker-manager/restore.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Importar funções do dockeractions
sys.path.append('/root/Documents/docker-manager')
from container.dockeractions import create_macvlan_interface, formatar_portas
from container.guacamoleactions import UserManager

def restore_containers():
    """
    Restaura containers após reboot do host.
    """
    logger.info("🔄 Iniciando restauração de containers após reboot")
    
    # Carrega o arquivo de controle
    try:
        with open('container/interface_control.json', 'r') as f:
            control_data = json.load(f)
        logger.info(f"📋 Carregados {len(control_data)} registros do arquivo de controle")
    except FileNotFoundError:
        logger.error("❌ Arquivo interface_control.json não encontrado")
        return False
    except json.JSONDecodeError:
        logger.error("❌ Erro ao decodificar interface_control.json")
        return False
    
    if not control_data:
        logger.info("📋 Nenhum container para restaurar")
        return True
    
    # Conecta ao Docker
    client = docker.from_env()
    guac_manager = UserManager()
    
    # Estatísticas
    total_containers = len(control_data)
    success_count = 0
    error_count = 0
    
    logger.info(f"🚀 Iniciando restauração de {total_containers} containers")
    
    for entry in control_data:
        container_name = entry['container_name']
        interface_name = entry['interface']
        
        logger.info(f"🔧 Restaurando container: {container_name}")
        
        try:
            # 1. Extrair informações do nome do container
            if '-' in container_name:
                prefix = container_name.split('-')[0]
                num_container = int(container_name.split('-')[-1])
            else:
                logger.warning(f"⚠️ Nome do container {container_name} não segue padrão esperado")
                prefix = container_name
                num_container = 1
            
            # 2. Verificar se o container existe
            existing_container = None
            try:
                existing_container = client.containers.get(container_name)
                logger.info(f"🔍 Container {container_name} encontrado, removendo versão antiga")
                
                # Para o container se estiver rodando
                if existing_container.status == 'running':
                    existing_container.stop(timeout=10)
                    logger.info(f"⏹️ Container {container_name} parado")
                
                # Guarda informações antes de remover
                old_image = existing_container.image.tags[0] if existing_container.image.tags else 'webdevops/php-apache:8.2'
                old_ports = existing_container.ports
                
                # Remove o container antigo
                existing_container.remove(force=True)
                logger.info(f"🗑️ Container {container_name} removido")
                
            except docker.errors.NotFound:
                logger.info(f"🔍 Container {container_name} não encontrado, criando novo")
                # Usar valores padrão
                old_image = 'webdevops/php-apache:8.2'
                old_ports = {}
            
            # 3. Recriar a interface macvlan
            logger.info(f"🌐 Criando interface {interface_name}")
            new_ip = create_macvlan_interface(num_container, "macvlan", "ens192")
            
            if new_ip in ["Erro", "Sem IP"]:
                logger.error(f"❌ Falha ao criar interface {interface_name}: {new_ip}")
                error_count += 1
                continue
            
            logger.info(f"✅ Interface {interface_name} criada com IP: {new_ip}")
            
            # 4. Determinar portas (usar padrão se não conseguir extrair)
            ports = [22, 80, 3306]  # Portas padrão
            
            # 5. Preparar diretórios
            container_files_base_dir = "/root/Documents/docker-manager/container/files"
            container_dir = os.path.join(container_files_base_dir, container_name)
            container_dir_html = os.path.join(container_dir, 'html')
            container_dir_mysql = os.path.join(container_dir, 'mysql')
            
            # Criar diretórios se não existirem
            os.makedirs(container_dir_html, exist_ok=True)
            os.makedirs(container_dir_mysql, exist_ok=True)
            
            # 6. Recriar o container
            logger.info(f"🐳 Recriando container {container_name} com IP {new_ip}")
            
            port_map = {f"{port}/tcp": (new_ip, port) for port in ports}
            
            new_container = client.containers.run(
                image=old_image,
                name=container_name,
                detach=True,
                ports=port_map,
                volumes={
                    container_dir_html: {'bind': '/var/www/html', 'mode': 'rw'},
                    container_dir_mysql: {'bind': '/var/lib/mysql', 'mode': 'rw'}
                }
            )
            
            logger.info(f"✅ Container {container_name} recriado com sucesso")
            
            # 7. Atualizar conexão do Guacamole
            logger.info(f"🔗 Atualizando conexão Guacamole para {container_name}")
            try:
                result_guac = guac_manager.atualizar_conexao(
                    username=container_name,
                    conn_name='Conexão SSH ' + container_name,
                    new_params={"hostname": new_ip}
                )
                
                if result_guac['status'] == 'success':
                    logger.info(f"✅ Conexão Guacamole atualizada para {container_name}")
                else:
                    logger.warning(f"⚠️ Erro ao atualizar Guacamole: {result_guac['message']}")
                    
            except Exception as e:
                logger.warning(f"⚠️ Erro ao atualizar Guacamole para {container_name}: {e}")
            
            success_count += 1
            logger.info(f"✅ Container {container_name} restaurado com sucesso!")
            
        except Exception as e:
            logger.error(f"❌ Erro ao restaurar container {container_name}: {e}")
            error_count += 1
            
        # Pequena pausa entre containers
        time.sleep(2)
    
    # 8. Salvar alterações do Guacamole
    try:
        guac_manager.save_xml()
        logger.info("💾 Alterações do Guacamole salvas")
    except Exception as e:
        logger.error(f"❌ Erro ao salvar alterações do Guacamole: {e}")
    
    # 9. Resultado final
    logger.info(f"🏁 Restauração concluída:")
    logger.info(f"   ✅ Sucessos: {success_count}")
    logger.info(f"   ❌ Erros: {error_count}")
    logger.info(f"   📊 Total: {total_containers}")
    
    return error_count == 0

if __name__ == "__main__":
    restore_containers()
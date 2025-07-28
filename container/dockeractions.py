import os, subprocess, sys, docker, time, re, json, shutil
import logging, container.guacamoleactions

# Configuração de logging
logger = logging.getLogger('container.dockeractions')

# Objeto para gerenciar conexões do guacamole
guacamolemgr = container.guacamoleactions.UserManager()

DEBUG = True # Altere para False para desabilitar prints de debug

def debug_print(*args, **kwargs):
    message = ' '.join(str(arg) for arg in args)
    if DEBUG:
        print("[DEBUG - DOCKER]:", *args, **kwargs)
    # Sempre loga no arquivo, independente do DEBUG
    logger.debug(f"[DEBUG - DOCKER]: {message}")

def formatar_portas(ports):
    """
    Recebe o dict ports do Docker e retorna uma string formatada: porta(serviço) ex.: 80(HTTP) 
    Exemplo: {'80/tcp': [{'HostIp': '0.0.0.0', 'HostPort': '8183'}]} => "8183:80"
    """
    port_mapping = {"80": "HTTP", "443": "HTTPS", "3306": "MySQL", "8080": "HTTP-Alt", "22": "SSH"}
    host_address = ''
    portas = []
    for container_port, bindings in ports.items():
        if bindings:
            for bind in bindings:
                host_port = bind.get('HostPort')
                host_address = bind.get('HostIp')
                service = port_mapping.get(host_port, host_port)
                portas.append(f"{host_port}({service})")
    return {'portas': portas, 'endereco': host_address}

def listar_containers_ativos():
    # Lista os containers
    logger.info("Iniciando listagem de containers ativos")
    client = docker.from_env()
    containers = client.containers.list(all=True)
    info = []
    name_filter = ['guacamole', 'guacd', 'guacamoledb']
    logger.info(f"Encontrados {len(containers)} containers totais")
    for container in containers:
        if container.name in name_filter:
            debug_print(f"[DEBUG] Ignorando container: {container.name}")
            continue
        
        # Log detalhado de cada container processado
        logger.info(f"Processando container: {container.name} (ID: {container.id[:12]}) - Status: {container.status}")
        
        info.append({
            'id': container.id,
            'nome': container.name,
            'imagem': container.image.tags,
            'status': container.status,
            'ports': formatar_portas(container.ports)['portas'],
            'endereco': formatar_portas(container.ports)['endereco'],
        })
    logger.info(f"Listagem concluída: {len(info)} containers válidos")
    return info

# Cria interfaces macvlan e obtém IPs via DHCP.
def create_macvlan_interface(num_interface, base_name="macvlan", parent_interface="ens192"):
    """
    Cria interfaces macvlan e obtém IPs via DHCP de forma síncrona.

    Args:
        base_name (str): Prefixo para os nomes das interfaces.
        num_interfaces (int): Número de interfaces a serem criadas.
        parent_interface (str): Interface física pai.

    Returns:
        str: Nome da interface e IP atribuído.
    """
    interface_name = f"{base_name}{num_interface:02d}"
    logger.info(f"Criando interface macvlan: {interface_name}")
    debug_print(f"Criando interface: {interface_name}")

    # Verifica se a interface já existe
    result = subprocess.run(["ip", "link", "show"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if interface_name in result.stdout.decode():
        logger.info(f"Interface {interface_name} já existe, reutilizando")
        debug_print(f"A interface {interface_name} já existe. Usando a existente.")
        # Obter IP atribuído
        result = subprocess.run(["ip", "addr", "show", interface_name], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        match = re.search(r"inet (\d+\.\d+\.\d+\.\d+)/", result.stdout.decode())
        ip_address = match.group(1) if match else "Sem IP"
        logger.info(f"IP da interface {interface_name}: {ip_address}")
        return ip_address

    # Criar interface macvlan
    try:
        logger.info(f"Criando nova interface macvlan {interface_name} na interface pai {parent_interface}")
        subprocess.run(["sudo", "ip", "link", "add", "link", parent_interface,
                        "name", interface_name, "type", "macvlan", "mode", "bridge"], check=True)

        # Ativar interface
        logger.info(f"Ativando interface {interface_name}")
        subprocess.run(["sudo", "ip", "link", "set", interface_name, "up"], check=True)

        # Obter IP via DHCP
        logger.info(f"Solicitando IP via DHCP para interface {interface_name}")
        subprocess.run(["sudo", "dhclient", interface_name], check=True)

        # Aguardar atribuição de IP
        logger.info(f"Aguardando atribuição de IP para interface {interface_name}")
        for _ in range(10):
            result = subprocess.run(["ip", "addr", "show", interface_name], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            match = re.search(r"inet (\d+\.\d+\.\d+\.\d+)/", result.stdout.decode())
            if match:
                ip_address = match.group(1)
                logger.info(f"IP {ip_address} atribuído à interface {interface_name}")
                break
            time.sleep(1)
        else:
            ip_address = "Sem IP"
            logger.error(f"Não foi possível obter IP para interface {interface_name}")

    except Exception as e:
        logger.error(f"Erro ao criar ou configurar interface {interface_name}: {e}")
        debug_print(f"\nErro ao criar ou configurar interface {interface_name}: {e}")
        ip_address = "Erro"

    return ip_address

# Cria containers.
def create_container(num_container, prefix, image, ports, ip, environment=None):
    """
    Cria containers de forma síncrona.

    Args:
        num_container (int): Número do container.
        prefix (str): Prefixo para o nome do container.
        image (str): Imagem do container.
        ports (list): Lista de portas a serem expostas.
        ip (str): IP atribuído à interface macvlan.
        environment (dict): Variáveis de ambiente para o container.

    Returns:
        None
    """
    container_name = f"{prefix}-{num_container:02d}"
    logger.info(f"Criando container: {container_name} com imagem {image}")
    debug_print(f"Chamando create_container: num_container={num_container}, prefix={prefix}, image={image}, ports={ports}, ip={ip}, environment={environment}")
    
    client = docker.from_env()
    debug_print(f"Nome do container a ser criado: {container_name}")
    debug_print(f"Portas a serem mapeadas: {ports}")
    port_map = {f"{port}/tcp": (ip, port) for port in ports[0]}
    debug_print(f"Mapeamento de portas: {port_map}")
    
    container_files_base_dir = "/root/Documents/docker-manager/container/files"
    try:
        # Cria uma pasta para o container, se não existir
        container_dir = os.path.join(container_files_base_dir, container_name)
        # Define os diretórios para HTML e MySQL    
        container_dir_html = os.path.join(container_dir, 'html')
        container_dir_mysql = os.path.join(container_dir, 'mysql')
        if not os.path.exists(container_dir):
            os.makedirs(container_dir)
            os.makedirs(container_dir_html)
            os.makedirs(container_dir_mysql)
            logger.info(f"Pastas criadas para o container: {container_dir}")
            debug_print(f"Pastas criadas para o container: {container_dir}")
        else:
            logger.info(f"Pasta já existe para o container: {container_dir}")
            debug_print(f"Pasta já existe para o container: {container_dir}")
        
        if not os.path.exists(container_dir_html) or not os.path.exists(container_dir_mysql):
            os.makedirs(container_dir_html)
            os.makedirs(container_dir_mysql)
            logger.info(f"Pastas criadas para o container: {container_dir_html} e {container_dir_mysql}")
            debug_print(f"Pastas criadas para o container: {container_dir_html} e {container_dir_mysql}")
        else:
            logger.info(f"Pasta já existe para o container: {container_dir_html} e {container_dir_mysql}")
            debug_print(f"Pasta já existe para o container: {container_dir_html} e {container_dir_mysql}")
        
        # Cria o container com as variáveis de ambiente, se fornecidas
        if environment:
            logger.info(f"Criando container {container_name} com variáveis de ambiente")
            debug_print(f"Criando container com variáveis de ambiente...")
            client.containers.run(image, 
                                  name=container_name, 
                                  detach=True, 
                                  ports=port_map, 
                                  environment=environment, 
                                  volumes={
                                      container_dir_html: {'bind': '/var/www/html', 'mode': 'rw'},
                                      container_dir_mysql: {'bind': '/var/lib/mysql', 'mode': 'rw'}
                                  })
        else:
            logger.info(f"Criando container {container_name} sem variáveis de ambiente")
            debug_print(f"Criando container sem variáveis de ambiente...")
            client.containers.run(image, 
                                  name=container_name, 
                                  detach=True, 
                                  ports=port_map,
                                  volumes={
                                      container_dir_html: {'bind': '/var/www/html', 'mode': 'rw'},
                                      container_dir_mysql: {'bind': '/var/lib/mysql', 'mode': 'rw'}
                                  })
        
        # Atualiza arquivo de controle para ambos os casos
        debug_print(f"Container criado. Atualizando arquivo de controle...")
        try:
            with open('container/interface_control.json', 'r+') as f:
                control_data = json.load(f)
                control_data.append({
                    'container_name': f"{prefix}-{num_container:02d}",
                    'interface': f"macvlan{num_container:02d}"
                })
                f.seek(0)
                json.dump(control_data, f, indent=4)
                f.truncate()
            logger.info(f"Arquivo de controle atualizado com container {container_name}")
            debug_print(f"interface_control.json atualizado com container {container_name}")
        except Exception as e:
            logger.error(f"Falha ao atualizar interface_control.json: {e}")
            debug_print(f"Falha ao atualizar interface_control.json: {e}")
        
        logger.info(f"Container {container_name} criado com sucesso!")
        debug_print(f"Container {container_name} criado com sucesso!")
        return {'status': 'success', 'message': 'Container criado com sucesso!'}
    except Exception as e:
        logger.error(f"Erro ao criar container {container_name}: {e}")
        debug_print(f"Erro ao criar container {container_name}: {e}")
        return {'status': 'error', 'message': 'Erro ao criar container: ' + str(e)}

# Deleta interfaces macvlan.
def delete_macvlan_interface(container_name):
    """
    Deleta a interface macvlan associada ao container fornecido.
    
    Args:
        container_name (str): Nome do container para encontrar a interface associada.
    
    Returns:
        dict: Status da operação e mensagem.
    """
    interface_name = None
    debug_print(f"Procurando a interface macvlan para o container: {container_name}", flush=True)
    logger.info(f"Iniciando deleção de interface para container: {container_name}")
    
    try:
        with open('container/interface_control.json', 'r') as f:
            control_data = json.load(f)
            for entry in control_data:
                if entry['container_name'] == container_name:
                    interface_name = entry['interface']
                    break
    except FileNotFoundError:
        logger.error("Arquivo de controle de interfaces não encontrado")
        return {"status": "error", "message": "Arquivo de controle de interfaces não encontrado."}  

    if interface_name:
        debug_print(f"Deletando interface: {interface_name}", flush=True)
        logger.info(f"Deletando interface: {interface_name}")
        
        try:
            # Verifica se a interface existe antes de tentar deletar
            result = subprocess.run(["ip", "link", "show"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            if interface_name not in result.stdout.decode():
                debug_print(f"A interface {interface_name} não existe. Nada a fazer.")
                logger.info(f"Interface {interface_name} não existe, nada a fazer")
                return {"status": "success", "message": f"Interface {interface_name} não encontrada, nada a fazer."}
            
            # 1. Primeiro, mata todos os processos dhclient associados à interface
            logger.info(f"Encerrando processos dhclient para interface {interface_name}")
            try:
                # Encontra e mata processos dhclient específicos da interface
                result = subprocess.run(["pgrep", "-f", f"dhclient.*{interface_name}"], 
                                      stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                if result.stdout:
                    pids = result.stdout.decode().strip().split('\n')
                    for pid in pids:
                        if pid.strip():
                            logger.info(f"Matando processo dhclient PID: {pid}")
                            subprocess.run(["sudo", "kill", "-9", pid.strip()], 
                                         stderr=subprocess.DEVNULL)
                            
                # Aguarda um pouco para garantir que os processos foram encerrados
                time.sleep(1)
                            
            except Exception as e:
                logger.warning(f"Erro ao encerrar processos dhclient: {e}")
                # Continua mesmo se houver erro ao matar processos
            
            # 2. Libera o lease DHCP (se ainda existir)
            logger.info(f"Liberando lease DHCP da interface {interface_name}")
            try:
                subprocess.run(["sudo", "dhclient", "-r", interface_name], 
                             check=True, timeout=10,
                             stdout=subprocess.DEVNULL, 
                             stderr=subprocess.DEVNULL)
            except (subprocess.CalledProcessError, subprocess.TimeoutExpired) as e:
                logger.warning(f"Erro/timeout ao liberar lease DHCP: {e}")
                # Continua mesmo se houver erro
            
            # 3. Remove a interface
            logger.info(f"Removendo interface {interface_name}")
            subprocess.run(["sudo", "ip", "link", "delete", interface_name], 
                         check=True, timeout=10)
            
            # 4. Verifica se a interface foi realmente removida
            time.sleep(1)
            result = subprocess.run(["ip", "link", "show"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            if interface_name in result.stdout.decode():
                logger.error(f"Interface {interface_name} ainda existe após tentativa de deleção")
                return {"status": "error", "message": f"Falha ao deletar interface {interface_name}"}
            
            logger.info(f"Interface {interface_name} deletada com sucesso")
            return {"status": "success", "message": f"Interface {interface_name} deletada com sucesso."}
            
        except subprocess.TimeoutExpired:
            logger.error(f"Timeout ao deletar interface {interface_name}")
            return {"status": "error", "message": f"Timeout ao deletar interface {interface_name}"}
        except Exception as e:
            logger.error(f"Erro ao deletar interface {interface_name}: {e}")
            return {"status": "error", "message": f"Erro ao deletar interface {interface_name}: {e}"}
    else:
        logger.info(f"Nenhuma interface encontrada para o container {container_name}")
        return {"status": "success", "message": f"Nenhuma interface encontrada para o container {container_name}. Deletando o container sem deletar a interface."}

# Deleta containers.
def delete_container(container_id):
    """
    Deleta containers de forma síncrona.

    Args:
        container_id (str): ID do container a ser deletado.

    Returns:
        dict: Status da operação e mensagem.
    """
    logger.info(f"Deletando container: {container_id}")
    client = docker.from_env()
    # Define o diretório base para os arquivos do container
    container_files_base_dir = "/root/Documents/docker-manager/container/files"
    try:
        container = client.containers.get(container_id)
        container_name = container.name
        
        # Define o diretório do container (mas NÃO deleta ainda)
        container_dir = os.path.join(container_files_base_dir, container_name)
        
        debug_print("Preparando para deletar container com ID:", container_id)
        logger.info(f"Container encontrado: {container_name}")
        debug_print(f"Container encontrado: {container_name}")
        
        # 1. Primeiro: Para o container se estiver rodando
        if container.status == 'running':
            logger.info(f"Parando container {container_name} antes de deletar")
            container.stop()
            logger.info(f"Container {container_name} parado com sucesso")
        
        # 2. Segundo: Deleta a interface macvlan associada
        logger.info(f"Deletando interface macvlan associada ao container {container_name}")
        debug_print(f"Deletando macvlan interface associada ao container {container_name}")
        result = delete_macvlan_interface(container_name)
        if result['status'] == "error":
            logger.error(f"Erro ao deletar interface: {result['message']}")
            return {"status": "error", "message": result['message'], "container_name": container_name}
        
        # 3. Terceiro: Remove o container Docker
        logger.info(f"Removendo container {container_name}")
        container.remove(force=True)
        logger.info(f"Container {container_name} removido com sucesso")
        
        # 4. Quarto: Aguarda um pouco para garantir que o Docker liberou os arquivos
        time.sleep(1)
        
        # 5. Quinto: AGORA deleta o diretório do container
        debug_print("Deletando diretório do container:", container_dir)
        if os.path.exists(container_dir):
            logger.info(f"Deletando diretório do container: {container_dir}")
            debug_print(f"Deletando diretório do container: {container_dir}")
            
            # Tenta deletar com retry em caso de arquivos ainda bloqueados
            max_attempts = 3
            for attempt in range(max_attempts):
                try:
                    # Primeiro, tenta alterar permissões recursivamente
                    subprocess.run(['sudo', 'chmod', '-R', '755', container_dir], 
                                 stderr=subprocess.DEVNULL)
                    
                    # Depois, remove o diretório
                    shutil.rmtree(container_dir)
                    logger.info(f"Diretório {container_dir} deletado com sucesso na tentativa {attempt + 1}")
                    break
                    
                except OSError as e:
                    if attempt < max_attempts - 1:
                        logger.warning(f"Tentativa {attempt + 1} falhou ao deletar {container_dir}: {e}. Tentando novamente...")
                        time.sleep(1)
                    else:
                        logger.error(f"Falha ao deletar diretório {container_dir} após {max_attempts} tentativas: {e}")
                        # Tenta forçar com sudo
                        try:
                            subprocess.run(['sudo', 'rm', '-rf', container_dir], check=True)
                            logger.info(f"Diretório {container_dir} deletado com sudo")
                        except subprocess.CalledProcessError as sudo_error:
                            logger.error(f"Falha ao deletar com sudo: {sudo_error}")
                            return {"status": "error", "message": f"Falha ao deletar diretório do container: {e}", "container_name": container_name}
        else:
            logger.info(f"Nenhum diretório encontrado para o container: {container_dir}")
            debug_print(f"Nenhum diretório encontrado para o container: {container_dir}")
        
        # 6. Sexto: Atualiza o arquivo de controle de interfaces
        logger.info(f"Atualizando arquivo de controle de interfaces")
        try:
            with open('container/interface_control.json', 'r+') as f:
                control_data = json.load(f)
                control_data = [entry for entry in control_data if entry['container_name'] != container_name]
                f.seek(0)
                f.truncate()
                json.dump(control_data, f, indent=4)
            logger.info(f"Arquivo de controle atualizado, container {container_name} removido")
        except FileNotFoundError:
            logger.error("Arquivo de controle de interfaces não encontrado")
            return {"status": "error", "message": "Arquivo de controle de interfaces não encontrado."}
        except Exception as e:
            logger.error(f"Erro ao atualizar arquivo de controle: {e}")
            return {"status": "error", "message": f"Erro ao atualizar arquivo de controle de interfaces: {e}"}
        
        logger.info(f"Container {container_name} deletado com sucesso")
        return {"status": "success", "message": f"Container {container_name} deletado com sucesso.", "container_name": container_name}
        
    except docker.errors.NotFound:
        logger.error(f"Container não encontrado: {container_id}")
        return {"status": "error", "message": f"Container não encontrado.", "container_name": "unknown"}
    except Exception as e:
        logger.error(f"Erro ao deletar container: {e}")
        return {"status": "error", "message": f"Erro ao deletar container: {e}", "container_name": "unknown"}

# Renova o endereço IP de uma interface macvlan.
def renew_macvlan_ip(interface_name):
    """
    Renova o endereço IP de uma interface macvlan.

    Args:
        interface_name (str): Nome da interface macvlan.

    Returns:
        str: Novo endereço IP atribuído ou mensagem de erro.
    """
    debug_print(f"\nRenovando IP da interface: {interface_name}", flush=True)
    logger.info(f"Renovando IP da interface: {interface_name}")
    
    try:
        # 1. Primeiro, mata todos os processos dhclient associados à interface
        logger.info(f"Encerrando processos dhclient para interface {interface_name}")
        try:
            result = subprocess.run(["pgrep", "-f", f"dhclient.*{interface_name}"], 
                                  stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            if result.stdout:
                pids = result.stdout.decode().strip().split('\n')
                for pid in pids:
                    if pid.strip():
                        logger.info(f"Matando processo dhclient PID: {pid}")
                        subprocess.run(["sudo", "kill", "-9", pid.strip()], 
                                     stderr=subprocess.DEVNULL)
                                     
            # Aguarda um pouco para garantir que os processos foram encerrados
            time.sleep(1)
                        
        except Exception as e:
            logger.warning(f"Erro ao encerrar processos dhclient: {e}")
        
        # 2. Liberar o lease DHCP atual
        logger.info(f"Liberando lease DHCP da interface {interface_name}")
        try:
            subprocess.run(["sudo", "dhclient", "-r", interface_name], 
                         check=True, timeout=10,
                         stdout=subprocess.DEVNULL, 
                         stderr=subprocess.DEVNULL)
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
            logger.warning(f"Erro/timeout ao liberar lease DHCP de {interface_name}")
        
        # 3. Deletar a interface
        logger.info(f"Deletando interface {interface_name}")
        subprocess.run(["sudo", "ip", "link", "delete", interface_name], 
                     check=True, timeout=10)
        
        # 4. Aguardar um pouco antes de recriar
        time.sleep(2)
        
        # 5. Criar uma nova interface com o mesmo nome
        logger.info(f"Criando nova interface {interface_name}")
        subprocess.run(["sudo", "ip", "link", "add", "link", "ens192", 
                       "name", interface_name, "type", "macvlan", "mode", "bridge"], 
                     check=True, timeout=10)
        
        # 6. Ativar a interface
        logger.info(f"Ativando interface {interface_name}")
        subprocess.run(["sudo", "ip", "link", "set", interface_name, "up"], 
                     check=True, timeout=10)
        
        # 7. Aguardar um pouco antes de solicitar DHCP
        time.sleep(1)
        
        # 8. Solicitar um novo lease DHCP
        logger.info(f"Solicitando novo IP via DHCP para interface {interface_name}")
        subprocess.run(["sudo", "dhclient", interface_name], 
                     check=True, timeout=30)
        
        # 9. Aguardar e verificar o novo IP atribuído (com retry)
        logger.info(f"Aguardando atribuição de IP para interface {interface_name}")
        for attempt in range(15):  # Tenta por 15 segundos
            result = subprocess.run(["ip", "addr", "show", interface_name], 
                                  stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            match = re.search(r"inet (\d+\.\d+\.\d+\.\d+)/", result.stdout.decode())
            if match:
                ip_address = match.group(1)
                logger.info(f"Novo IP atribuído à interface {interface_name}: {ip_address}")
                debug_print(f"\nNovo IP atribuído à interface {interface_name}: {ip_address}", flush=True)
                return ip_address
            time.sleep(1)
        
        # Se chegou aqui, não conseguiu obter IP
        logger.error(f"Não foi possível obter IP para interface {interface_name}")
        debug_print(f"\nNão foi possível renovar o IP da interface {interface_name}.", flush=True)
        return "Sem IP"
        
    except subprocess.TimeoutExpired as e:
        logger.error(f"Timeout ao renovar IP da interface {interface_name}: {e}")
        debug_print(f"\nTimeout ao renovar IP da interface {interface_name}: {e}", flush=True)
        return "Erro"
    except Exception as e:
        logger.error(f"Erro ao renovar IP da interface {interface_name}: {e}")
        debug_print(f"\nErro ao renovar IP da interface {interface_name}: {e}", flush=True)
        return "Erro"

# Inicia o container
def start_docker_container(container_id):
    # Function to start a Docker container by its ID.
    logger.info(f"Iniciando container: {container_id}")
    client = docker.from_env()
    try:
        if not container_id:
            logger.error("ID do container é obrigatório para operação de start")
            return {'status': 'error', 'message': 'ID do container é obrigatório!', 'container_name': None}
        container = client.containers.get(container_id)
        container.start()
        logger.info(f"Container {container.name} iniciado com sucesso")
        debug_print(f"\nContainer {container.name} iniciado com sucesso.")
        return {'status': 'success', 'message': 'Container iniciado com sucesso!', 'container_name': container.name}
    except docker.errors.NotFound:
        logger.error(f"Container não encontrado: {container_id}")
        return {'status': 'error', 'message': 'Container não encontrado!', 'container_name': None}
    except Exception as e:
        logger.error(f"Erro ao iniciar container {container_id}: {e}")
        debug_print(f"\nErro ao iniciar container {container_id}: {e}")
        return {'status': 'error', 'message': f'Erro ao iniciar container: {str(e)}', 'container_name': None}

# Para o container
def stop_docker_container(container_id):
    # Function to stop a Docker container by its ID.
    logger.info(f"Parando container: {container_id}")
    client = docker.from_env()
    try:
        if not container_id:
            logger.error("ID do container é obrigatório para operação de stop")
            return {'status': 'error', 'message': 'ID do container é obrigatório!', 'container_name': None}
        container = client.containers.get(container_id)
        container.stop()
        logger.info(f"Container {container.name} parado com sucesso")
        debug_print(f"\nContainer {container.name} parado com sucesso.")
        return {'status': 'success', 'message': 'Container parado com sucesso!', 'container_name': container.name}
    except docker.errors.NotFound:
        logger.error(f"Container não encontrado: {container_id}")
        return {'status': 'error', 'message': 'Container não encontrado!', 'container_name': container.name}
    except Exception as e:
        logger.error(f"Erro ao parar container {container_id}: {e}")
        debug_print(f"\nErro ao parar container {container_id}: {e}")
        return {'status': 'error', 'message': f'Erro ao parar container: {str(e)}', 'container_name': None}

# Reinicia o container
def restart_docker_container(container_id):
    # Function to restart a Docker container by its ID.
    logger.info(f"Reiniciando container: {container_id}")
    client = docker.from_env()
    try:
        if not container_id:
            logger.error("ID do container é obrigatório para operação de restart")
            return {'status': 'error', 'message': 'ID do container é obrigatório!', 'container_name': None}
        container = client.containers.get(container_id)
        container.restart()
        logger.info(f"Container {container.name} reiniciado com sucesso")
        debug_print(f"\nContainer {container.name} reiniciado com sucesso.")
        return {'status': 'success', 'message': 'Container reiniciado com sucesso!', 'container_name': container.name}
    except docker.errors.NotFound:
        logger.error(f"Container não encontrado: {container_id}")
        return {'status': 'error', 'message': 'Container não encontrado!', 'container_name': None}
    except Exception as e:
        logger.error(f"Erro ao reiniciar container {container_id}: {e}")
        debug_print(f"\nErro ao reiniciar container {container_id}: {e}")
        return {'status': 'error', 'message': f'Erro ao reiniciar container: {str(e)}', 'container_name': None}

# Renova o IP do container.
def renew_container_ip(container_id):
    """
    Renova o IP do container através de sua interface macvlan.
    
    Args:
        container_id (str): ID do container Docker.
    
    Returns:
        dict: Status da operação e mensagem.
    """
    logger.info(f"Renovando IP do container: {container_id}")
    client = docker.from_env()
    try:
        if not container_id:
            logger.error("ID do container é obrigatório para operação de renovação de IP")
            return {'status': 'error', 'message': 'ID do container é obrigatório!', 'container_name': None}
        
        container = client.containers.get(container_id)
        container_name = container.name
        
        # Buscar a interface associada ao container
        interface_name = None
        try:
            with open('container/interface_control.json', 'r') as f:
                control_data = json.load(f)
                for entry in control_data:
                    if entry['container_name'] == container_name:
                        interface_name = entry['interface']
                        break
                else:
                    logger.error(f"Nenhuma interface encontrada para o container {container_name}")
                    return {'status': 'error', 'message': f'Nenhuma interface encontrada para o container {container_name}', 'container_name': container_name}
        except FileNotFoundError:
            logger.error("Arquivo de controle de interfaces não encontrado")
            return {'status': 'error', 'message': 'Arquivo de controle de interfaces não encontrado', 'container_name': container_name}
        
        if interface_name:
            # Renovar o IP da interface
            new_ip = renew_macvlan_ip(interface_name)
            if new_ip == "Erro":
                logger.error(f"Erro ao renovar IP da interface {interface_name}")
                return {'status': 'error', 'message': f'Erro ao renovar IP da interface {interface_name}', 'container_name': container_name}
            elif new_ip == "Sem IP":
                logger.error(f"Não foi possível obter novo IP para a interface {interface_name}")
                return {'status': 'error', 'message': f'Não foi possível obter novo IP para a interface {interface_name}', 'container_name': container_name}
            else:
                logger.info(f"IP do container {container_name} renovado com sucesso. Novo IP: {new_ip}")
        else:
            logger.error(f"Interface não encontrada para o container {container_name}")
            return {'status': 'error', 'message': f'Interface não encontrada para o container {container_name}', 'container_name': container_name}
            
        # Remove apenas o container, não a interface ou as pastas associadas a ele
        container.remove(force=True)
        
        # Declarando variaveis para a criação do container
        num_container = int(container_name.split('-')[-1])
        prefix = container_name.split('-')[0]
        image = container.image.tags[0] if container.image.tags else 'unknown'
        ports = [22, 80, 3306]
        debug_print(f"Preparando variaveis para a recriação do container: {container_name}")
        logger.info(f"Preparando variaveis para a recriação do container: {container_name}")
        debug_print(f"num_container: {num_container}, prefix: {prefix}, image: {image}, ports: {ports}, ip: {new_ip}")
        logger.info(f"num_container: {num_container}, prefix: {prefix}, image: {image}, ports: {ports}, ip: {new_ip}")
        
        # Cria o container novamente com o novo IP
        client.containers.run(image=image, 
            name=container_name, 
            detach=True, 
            ports={f"{port}/tcp": (new_ip, port) for port in ports}, 
            volumes={
                f"/root/Documents/docker-manager/container/files/{container_name}/html": {'bind': '/var/www/html', 'mode': 'rw'},
                f"/root/Documents/docker-manager/container/files/{container_name}/mysql": {'bind': '/var/lib/mysql', 'mode': 'rw'}
            }
        )
        logger.info(f"Container {container_name} criado com novo IP: {new_ip}")
        debug_print(f"\nContainer {container_name} criado com novo IP: {new_ip}")
    
        # Atualiza a conexão do guacamole com o novo IP
        result_guacamole = guacamolemgr.atualizar_conexao(container_name, f"Conexão SSH {container_name}", {"hostname": new_ip})
        if result_guacamole['status'] == 'error':
            logger.error(f"Erro ao atualizar conexão do Guacamole: {result_guacamole['message']}")
            return {'status': 'error', 'message': f'Erro ao atualizar conexão do Guacamole: {result_guacamole["message"]}', 'container_name': container_name}
        return {"status": "success", "message": f"Container {container_name} atualizado com novo IP: {new_ip}", "container_name": container_name, "new_ip": new_ip}

    except docker.errors.NotFound:
        logger.error(f"Container não encontrado: {container_id}")
        return {'status': 'error', 'message': 'Container não encontrado!', 'container_name': None}
    except Exception as e:
        logger.error(f"Erro ao renovar IP do container {container_id}: {e}")
        debug_print(f"\nErro ao renovar IP do container {container_id}: {e}")
        return {'status': 'error', 'message': f'Erro ao renovar IP: {str(e)}', 'container_name': None}


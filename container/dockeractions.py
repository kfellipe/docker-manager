import docker, json
    
def formatar_portas(ports):
    """
    Recebe o dict ports do Docker e retorna uma string formatada: "host:container"
    Exemplo: {'80/tcp': [{'HostIp': '0.0.0.0', 'HostPort': '8183'}]} => "8183:80"
    """
    portas_formatadas = []
    for container_port, bindings in ports.items():
        if bindings:
            for bind in bindings:
                host_port = bind.get('HostPort')
                host_address = bind.get('HostIp')
                portas_formatadas.append(f"{host_address}:{host_port} => {container_port}")
    return portas_formatadas

def listar_containers_ativos():
    client = docker.from_env()
    containers = client.containers.list(all=True)
    info = []
    for container in containers:
        info.append({
            'id': container.id,
            'nome': container.name,
            'imagem': container.image.tags,
            'status': container.status,
            'ports': formatar_portas(container.ports),
        })
    return info

# Create your views here.
def create_docker_container(max, container_type, name_prefix, container_port, configs):
    for i in range(1, int(max) + 1):
        imagem = container_type  # Default image, can be changed
        nome = name_prefix + "-" + str(i)
        portas = {f"{container_port}": 8180 + i}
        print(f"Creating container {nome} with image {imagem} and ports {portas}")
        # Create the Docker container
        client = docker.from_env()
        if container_type == 'mysql':
            # For MySQL, we need to set environment variables
            client.containers.run(
                image=imagem,
                name=nome,
                ports=portas,
                environment={
                    'MYSQL_ROOT_PASSWORD': configs['modalInput3'],
                    'MYSQL_DATABASE': configs['modalInput0'],
                    'MYSQL_USER': configs['modalInput1'],
                    'MYSQL_PASSWORD': configs['modalInput2']
                },
                detach=True  # Executa em background
            )
        else:
            client.containers.run(
                image=imagem,
                name=nome,
                ports=portas,
                detach=True  # Executa em background
            )
    return {'status': 'success', 'message': 'Containers criados com sucesso!'}

def delete_docker_container(containers_id):
    client = docker.from_env()
    try:
        if not containers_id:
            return {'status': 'error', 'message': 'ID do container obrigatorio!'}
        for container_id in containers_id:
            container = client.containers.get(container_id)
            container.stop()
            container.remove()
        return {'status': 'success', 'message': 'Containers removidos com sucesso!'}
    except docker.errors.NotFound:
        return {'status': 'error', 'message': 'Container não encontrado!'}
    
def stop_docker_container(containers_id):
    # View to stop a Docker container by its ID.
    client = docker.from_env()
    try:
        if not containers_id:
            return {'status': 'error', 'message': 'Nome do container é obrigatório!'}
        for container_id in containers_id:
            container = client.containers.get(container_id)
            container.stop()
        return {'status': 'success', 'message': 'Containers parados com sucesso!'}
    except docker.errors.NotFound:
        return {'status': 'error', 'message': 'Container não encontrado!'}
    
       
def start_docker_container(containers_id):
    # Function to start a Docker container by its ID.
    client = docker.from_env()
    try:
        if not containers_id:
            return {'status': 'error', 'message': 'Nome do container é obrigatório!'}
        for container_id in containers_id:
            container = client.containers.get(container_id)
            container.start()
        return {'status': 'success', 'message': 'Containers iniciados com sucesso!'}
    except docker.errors.NotFound:
        return {'status': 'error', 'message': 'Container não encontrado!'}
    
def restart_docker_container(containers_id):
    client = docker.from_env()
    try:
        if not containers_id:
            return {'status': 'error', 'message': 'Nome do container é obrigatório!'}
        for container_id in containers_id:
            container = client.containers.get(container_id)
            container.restart()
        return {'status': 'success', 'message': 'Containers reiniciados com sucesso!'}
    except docker.errors.NotFound:
        return {'status': 'error', 'message': 'Container não encontrado!'}
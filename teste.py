import docker

def listar_imagens_docker():
    client = docker.from_env()
    imagens = client.images.list()
    infos = []
    for imagem in imagens:
        info = {
            'id': imagem.id,
            'tags': imagem.tags,
            'size': imagem.attrs['Size'],
            'created': imagem.attrs['Created']
        }
        infos.append(info)
    return infos
containers = [{'nome': 'container1', 
               'imagem': 'nginx',
               'portas': '80:80'},
            #   {'nome': 'container2',
            #    'imagem': 'nginx',
            #    'portas': '80:80'},
            #   {'nome': 'container3',
            #    'imagem': 'nginx',
            #    'portas': '80:80'}
            ]

def create_containers(containers):
    client = docker.from_env()
    for container in containers:
        try:
            print(f"Creating container {container['nome']} with image {container['imagem']} and ports {container['portas']}")
            client.containers.run(container['imagem'], name=container['nome'], ports={container['portas'].split(':')[0]: container['portas'].split(':')[1]}, detach=True)
        except docker.errors.APIError as e:
            print(f"Error creating container {container['nome']}: {e}")
    return {'status': 'success', 'message': 'Containers created successfully!'}

create_containers(containers)
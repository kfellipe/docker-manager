from channels.generic.websocket import AsyncWebsocketConsumer
import json, time
import container.dockeractions # Módulo com funções de gerenciamento de containers

class Consumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()
        await self.send(json.dumps({
            'type': 'list-containers',
            'containers': container.dockeractions.listar_containers_ativos()
        }))
        
    async def receive(self, text_data):
        data = json.loads(text_data)
        
        if data['type'] == 'action':
            if data['action'] == 'stop':
                result = container.dockeractions.stop_docker_container(data['containers'])
                result_status = result['status']
                result_message = result['message']
                # time.sleep(2)
                await self.send(json.dumps({
                    'type': 'action-result',
                    'status': result_status,
                    'message': result_message
                }))
                
                await self.send(json.dumps({
                    'type': 'list-containers',
                    'containers': container.dockeractions.listar_containers_ativos()
                }))
                
            elif data['action'] == 'start':
                result = container.dockeractions.start_docker_container(data['containers'])
                result_status = result['status']
                result_message = result['message']
                # time.sleep(2)
                await self.send(json.dumps({
                    'type': 'action-result',
                    'status': result_status,
                    'message': result_message
                }))
                
                await self.send(json.dumps({
                    'type': 'list-containers',
                    'containers': container.dockeractions.listar_containers_ativos()
                }))
                
            elif data['action'] == 'delete':
                result = container.dockeractions.delete_docker_container(data['containers'])
                result_status = result['status']
                result_message = result['message']
                # time.sleep(2)
                await self.send(json.dumps({
                    'type': 'action-result',
                    'status': result_status,
                    'message': result_message
                }))
                
                await self.send(json.dumps({
                    'type': 'list-containers',
                    'containers': container.dockeractions.listar_containers_ativos()
                }))
                
            elif data['action'] == 'restart':
                result = container.dockeractions.restart_docker_container(data['containers'])
                result_status = result['status']
                result_message = result['message']
                # time.sleep(2)
                await self.send(json.dumps({
                    'type': 'action-result',
                    'status': result_status,
                    'message': result_message
                }))
                
                await self.send(json.dumps({
                    'type': 'list-containers',
                    'containers': container.dockeractions.listar_containers_ativos()
                }))
                
            elif data['action'] == 'refresh':
                await self.send(json.dumps({
                    'type': 'refresh-containers',
                    'status': 'success',
                    'message': 'Lista de containers atualizada.',
                    'containers': container.dockeractions.listar_containers_ativos()
                }))
                
            elif data['action'] == 'create':
                max_containers = data.get('count', 0)
                container_type = data['container_type']
                name_prefix = data.get('name_prefix', 'container')
                container_port = data.get('port', 0)
                configs = data.get('configs', {})
                # print(f"Creating {max_containers} containers of type {container_type} with prefix {name_prefix} and port {container_port} and configs {configs}")
                result = container.dockeractions.create_docker_container(max_containers, container_type, name_prefix, container_port, configs)
                result_status = result['status']
                result_message = result['message']
                # time.sleep(2)
                if result_status == 'success':
                    await self.send(json.dumps({
                        'type': 'action-result',
                        'status': result_status,
                        'message': result_message
                    }))
                    await self.send(json.dumps({
                        'type': 'list-containers',
                        'containers': container.dockeractions.listar_containers_ativos()
                    }))
                else:
                    await self.send(json.dumps({
                        'type': 'action-result',
                        'status': result_status,
                        'message': result_message
                    }))
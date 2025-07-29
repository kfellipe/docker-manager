from channels.generic.websocket import AsyncWebsocketConsumer
import json, time
import logging
import container.dockeractions # Módulo com funções de gerenciamento de containers

# Configuração de logging
logger = logging.getLogger('container.consumers')

DEBUG = False  # Altere para False para desabilitar prints de debug

def debug_print(*args, **kwargs):
    message = ' '.join(str(arg) for arg in args)
    if DEBUG:
        print(message, **kwargs)
    # Sempre loga no arquivo, independente do DEBUG
    logger.debug(message)

class Consumer(AsyncWebsocketConsumer):
    async def connect(self):
        logger.info(f"Nova conexão WebSocket estabelecida")
        await self.accept()
        await self.send(json.dumps({
            'type': 'list-containers',
            'containers': container.dockeractions.listar_containers_ativos()
        }))
        logger.info("Lista de containers enviada para nova conexão")
        
    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            logger.info(f"Recebida mensagem WebSocket: {data.get('type', 'unknown')} - {data.get('action', 'no-action')}")
        except json.JSONDecodeError as e:
            logger.error(f"Erro ao decodificar JSON: {e}")
            return
        
        if data['type'] == 'action':
            if data['action'] == 'stop':
                logger.info(f"Iniciando operação de parada para {len(data['containers'])} containers")
                success_count = 0
                error_count = 0
                total_count = len(data['containers'])
                
                for id in data['containers']:
                    result = container.dockeractions.stop_docker_container(id)
                    if result['status'] == 'success':
                        success_count += 1
                        logger.info(f"Container {result['container_name']} parado com sucesso")
                        # Envia uma mensagem de sucesso para o cliente
                        debug_print("enviando mensagem de sucesso para o cliente")
                        await self.send(json.dumps({
                            'type': 'action-progress',
                            'status': 'success',
                            'message': f"Container {result['container_name']} parado com sucesso."
                        }))
                        # Pequeno delay para garantir que a mensagem seja processada
                        import asyncio
                        await asyncio.sleep(0.3)
                    else:
                        error_count += 1
                        logger.error(f"Erro ao parar container {result.get('container_name', 'unknown')}: {result['message']}")
                        # Envia uma mensagem de erro para o cliente
                        await self.send(json.dumps({
                            'type': 'action-progress',
                            'status': 'error',
                            'message': f"Erro ao parar container {result['container_name']}: {result['message']}"
                        }))
                
                # Pequeno delay antes da mensagem final
                import asyncio
                await asyncio.sleep(0.2)
                
                # Determinar status final baseado nos resultados
                if error_count == 0:
                    final_status = 'success'
                    final_message = f"Todos os {total_count} containers foram parados com sucesso!"
                    logger.info(f"Operação de parada concluída com sucesso: {success_count}/{total_count}")
                elif success_count == 0:
                    final_status = 'error'
                    final_message = f"Falha ao parar todos os {total_count} containers!"
                    logger.error(f"Operação de parada falhou completamente: {error_count}/{total_count}")
                else:
                    final_status = 'warning'
                    final_message = f"Operação concluída com ressalvas: {success_count}/{total_count} containers parados com sucesso."
                    logger.warning(f"Operação de parada concluída com ressalvas: {success_count}/{total_count}")
                
                await self.send(json.dumps({
                    'type': 'action-completed',
                    'status': final_status,
                    'message': final_message
                }))
                await self.send(json.dumps({
                    'type': 'list-containers',
                    'containers': container.dockeractions.listar_containers_ativos()
                }))
                
            elif data['action'] == 'start':
                success_count = 0
                error_count = 0
                total_count = len(data['containers'])
                
                for id in data['containers']:
                    result = container.dockeractions.start_docker_container(id)
                    if result['status'] == 'success':
                        success_count += 1
                        # Envia uma mensagem de sucesso para o cliente
                        debug_print("enviando mensagem de sucesso para o cliente")
                        await self.send(json.dumps({
                            'type': 'action-progress',
                            'status': 'success',
                            'message': f"Container {result['container_name']} iniciado com sucesso."
                        }))
                        # Pequeno delay para garantir que a mensagem seja processada
                        import asyncio
                        await asyncio.sleep(0.3)
                    else:
                        error_count += 1
                        # Envia uma mensagem de erro para o cliente
                        await self.send(json.dumps({
                            'type': 'action-progress',
                            'status': 'error',
                            'message': f"Erro ao iniciar container {result['container_name']}: {result['message']}"
                        }))
                
                # Pequeno delay antes da mensagem final
                import asyncio
                await asyncio.sleep(0.2)
                
                # Determinar status final baseado nos resultados
                if error_count == 0:
                    final_status = 'success'
                    final_message = f"Todos os {total_count} containers foram iniciados com sucesso!"
                elif success_count == 0:
                    final_status = 'error'
                    final_message = f"Falha ao iniciar todos os {total_count} containers!"
                else:
                    final_status = 'warning'
                    final_message = f"Operação concluída com ressalvas: {success_count}/{total_count} containers iniciados com sucesso."
                
                await self.send(json.dumps({
                    'type': 'action-completed',
                    'status': final_status,
                    'message': final_message
                }))
                await self.send(json.dumps({
                    'type': 'list-containers',
                    'containers': container.dockeractions.listar_containers_ativos()
                }))
                
            elif data['action'] == 'delete':
                success_count = 0
                error_count = 0
                total_count = len(data['containers'])
                
                for id in data['containers']:
                    # Deleta o container
                    result_container = container.dockeractions.delete_container(id)
                    if result_container['status'] == 'success':
                        success_count += 1
                        await self.send(json.dumps({
                            'type': 'action-progress',
                            'status': 'success',
                            'message': f"Container {result_container['container_name']} deletado com sucesso."
                        }))
                    else:
                        error_count += 1
                        await self.send(json.dumps({
                            'type': 'action-progress',
                            'status': 'error',
                            'message': f"Erro ao deletar container {result_container['container_name']}: {result_container['message']}"
                        }))
                    
                    debug_print("enviando mensagem de progresso para o cliente")
                    # Pequeno delay para garantir que a mensagem seja processada
                    import asyncio
                    await asyncio.sleep(0.3)
                
                # Pequeno delay antes da mensagem final
                import asyncio
                await asyncio.sleep(0.2)
                
                # Determinar status final baseado nos resultados
                if error_count == 0:
                    final_status = 'success'
                    final_message = f"Todos os {total_count} containers foram deletados com sucesso!"
                elif success_count == 0:
                    final_status = 'error'
                    final_message = f"Falha ao deletar todos os {total_count} containers!"
                else:
                    final_status = 'warning'
                    final_message = f"Deleção concluída com ressalvas: {success_count}/{total_count} containers deletados com sucesso."
                
                await self.send(json.dumps({
                    'type': 'action-completed',
                    'status': final_status,
                    'message': final_message
                }))
                
                await self.send(json.dumps({
                    'type': 'list-containers',
                    'containers': container.dockeractions.listar_containers_ativos()
                }))
                
            elif data['action'] == 'restart':
                success_count = 0
                error_count = 0
                total_count = len(data['containers'])
                
                for id in data['containers']:
                    result = container.dockeractions.restart_docker_container(id)
                    if result['status'] == 'success':
                        success_count += 1
                        # Envia uma mensagem de sucesso para o cliente
                        debug_print("enviando mensagem de sucesso para o cliente")
                        await self.send(json.dumps({
                            'type': 'action-progress',
                            'status': 'success',
                            'message': f"Container {result['container_name']} reiniciado com sucesso."
                        }))
                        # Pequeno delay para garantir que a mensagem seja processada
                        import asyncio
                        await asyncio.sleep(0.3)
                    else:
                        error_count += 1
                        # Envia uma mensagem de erro para o cliente
                        await self.send(json.dumps({
                            'type': 'action-progress',
                            'status': 'error',
                            'message': f"Erro ao reiniciar container {result['container_name']}: {result['message']}"
                        }))
                
                # Pequeno delay antes da mensagem final
                import asyncio
                await asyncio.sleep(0.2)
                
                # Determinar status final baseado nos resultados
                if error_count == 0:
                    final_status = 'success'
                    final_message = f"Todos os {total_count} containers foram reiniciados com sucesso!"
                elif success_count == 0:
                    final_status = 'error'
                    final_message = f"Falha ao reiniciar todos os {total_count} containers!"
                else:
                    final_status = 'warning'
                    final_message = f"Operação concluída com ressalvas: {success_count}/{total_count} containers reiniciados com sucesso."
                
                await self.send(json.dumps({
                    'type': 'action-completed',
                    'status': final_status,
                    'message': final_message
                }))
                await self.send(json.dumps({
                    'type': 'list-containers',
                    'containers': container.dockeractions.listar_containers_ativos()
                }))
                
            elif data['action'] == 'renew_ip':
                success_count = 0
                error_count = 0
                total_count = len(data['containers'])
                
                for id in data['containers']:
                    result = container.dockeractions.renew_container_ip(id)
                    if result['status'] == 'success':
                        success_count += 1
                        # Envia uma mensagem de sucesso para o cliente
                        debug_print("enviando mensagem de sucesso para o cliente")
                        await self.send(json.dumps({
                            'type': 'action-progress',
                            'status': 'success',
                            'message': f"IP do container {result['container_name']} renovado com sucesso. Novo IP: {result.get('new_ip', 'N/A')}"
                        }))
                        # Pequeno delay para garantir que a mensagem seja processada
                        import asyncio
                        await asyncio.sleep(0.3)
                    else:
                        error_count += 1
                        # Envia uma mensagem de erro para o cliente
                        await self.send(json.dumps({
                            'type': 'action-progress',
                            'status': 'error',
                            'message': f"Erro ao renovar IP do container {result['container_name']}: {result['message']}"
                        }))
                
                # Pequeno delay antes da mensagem final
                import asyncio
                await asyncio.sleep(0.2)
                
                # Determinar status final baseado nos resultados
                if error_count == 0:
                    final_status = 'success'
                    final_message = f"Todos os {total_count} IPs foram renovados com sucesso!"
                elif success_count == 0:
                    final_status = 'error'
                    final_message = f"Falha ao renovar todos os {total_count} IPs!"
                else:
                    final_status = 'warning'
                    final_message = f"Renovação concluída com ressalvas: {success_count}/{total_count} IPs renovados com sucesso."
                
                await self.send(json.dumps({
                    'type': 'action-completed',
                    'status': final_status,
                    'message': final_message
                }))
                await self.send(json.dumps({
                    'type': 'list-containers',
                    'containers': container.dockeractions.listar_containers_ativos()
                }))
                
            elif data['action'] == 'refresh':
                debug_print("Refreshing container list")
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
                debug_print(f"Creating {max_containers} containers of type {container_type} with prefix {name_prefix} and port {container_port} and configs {configs}")
                
                success_count = 0
                error_count = 0
                
                for i in range(1, max_containers + 1):
                    container_name = f"{name_prefix}-{i:02d}"
                    
                    # Verifica se o container ja existe
                    existing_containers = container.dockeractions.listar_containers_ativos()
                    if any(c['nome'] == container_name for c in existing_containers):
                        await self.send(json.dumps({
                            'type': 'action-progress',
                            'status': 'warning',
                            'message': f"Já existe um container com o nome {container_name}. Pulando criação deste container."
                        }))
                        error_count += 1
                        continue
                    
                    # Cria a interface macvlan para o container
                    ip = container.dockeractions.create_macvlan_interface(num_interface=i, base_name="macvlan", parent_interface="ens192")
                    if ip in ["Erro", "Sem IP"]:
                        await self.send(json.dumps({
                            'type': 'action-progress',
                            'status': 'error',
                            'message': f"Erro ao criar interface macvlan para o container {container_name}."
                        }))
                        container.dockeractions.delete_macvlan_interface(num_interface=i, base_name="macvlan", parent_interface="ens192")
                        error_count += 1
                        continue
                    
                    # Cria o container Docker com a interface macvlan
                    if configs:
                        result_container = container.dockeractions.create_container(
                            num_container=i,
                            prefix=name_prefix,
                            image=container_type,
                            ip=ip,
                            ports=[container_port],
                            environment=configs
                        )
                    else:
                        result_container = container.dockeractions.create_container(
                            num_container=i,
                            prefix=name_prefix,
                            image=container_type,
                            ip=ip,
                            ports=[container_port]
                        )
                    
                    if result_container['status'] == 'success':
                        success_count += 1
                        await self.send(json.dumps({
                            'type': 'action-progress',
                            'status': 'success',
                            'message': f"Container {container_name} criado com sucesso!"
                        }))
                    else:
                        error_count += 1
                        await self.send(json.dumps({
                            'type': 'action-progress',
                            'status': 'error',
                            'message': f"Erro ao criar container {container_name}: {result_container['message']}"
                        }))
                    
                    # Pequeno delay entre containers
                    import asyncio
                    await asyncio.sleep(0.3)
                
                # Pequeno delay antes da mensagem final
                import asyncio
                await asyncio.sleep(0.2)
                
                # Determinar status final baseado nos resultados
                if error_count == 0:
                    final_status = 'success'
                    final_message = f"Todos os {max_containers} containers foram criados com sucesso!"
                elif success_count == 0:
                    final_status = 'error'
                    final_message = f"Falha ao criar todos os {max_containers} containers!"
                else:
                    final_status = 'warning'
                    final_message = f"Criação concluída com ressalvas: {success_count}/{max_containers} containers criados com sucesso."
                
                await self.send(json.dumps({
                    'type': 'action-completed',
                    'status': final_status,
                    'message': final_message
                }))
                
                await self.send(json.dumps({
                    'type': 'list-containers',
                    'containers': container.dockeractions.listar_containers_ativos()
                }))
                    
            elif data['action'] == 'create-single':
                container_name = data.get('container_name', 'container')
                container_number = data.get('container_number', 1)
                container_type = data['container_type']
                container_port = data.get('port', 0)
                configs = data.get('configs', {})
                debug_print(f"Creating single container: {container_name} of type {container_type} with number {container_number} and port {container_port} and configs {configs}")
                
                full_container_name = f"{container_name}-{container_number:02d}"
                
                # Verifica se já existe um container com o mesmo nome
                existing_containers = container.dockeractions.listar_containers_ativos()
                if any(c['nome'] == full_container_name for c in existing_containers):
                    await self.send(json.dumps({
                        'type': 'action-completed',
                        'status': 'error',
                        'message': f"Já existe um container com o nome {full_container_name}. Por favor, escolha outro nome."
                    }))
                    debug_print(f"[DEBUG] Container {full_container_name} já existe. Abortando criação.")
                    return
                
                # Cria a interface macvlan para o container
                ip = container.dockeractions.create_macvlan_interface(num_interface=container_number, base_name="macvlan", parent_interface="ens192")
                if ip in ["Erro", "Sem IP"]:
                    await self.send(json.dumps({
                        'type': 'action-completed',
                        'status': 'error',
                        'message': f"Erro ao criar interface macvlan para o container {full_container_name}."
                    }))
                    return
                
                # Cria o container Docker com a interface macvlan
                if configs:
                    result_container = container.dockeractions.create_container(
                        num_container=container_number,
                        prefix=container_name.rsplit('-', 1)[0] if '-' in container_name else container_name,
                        image=container_type,
                        ip=ip,
                        ports=[container_port],
                        environment=configs
                    )
                else:
                    result_container = container.dockeractions.create_container(
                        num_container=container_number,
                        prefix=container_name.rsplit('-', 1)[0] if '-' in container_name else container_name,
                        image=container_type,
                        ip=ip,
                        ports=[container_port]
                    )
                
                # Envia mensagem de progresso para a barra funcionar
                if result_container['status'] == 'success':
                    await self.send(json.dumps({
                        'type': 'action-progress',
                        'status': 'success',
                        'message': f"Container {full_container_name} criado com sucesso!"
                    }))
                    
                    # Pequeno delay antes da mensagem final
                    import asyncio
                    await asyncio.sleep(0.2)
                    
                    await self.send(json.dumps({
                        'type': 'action-completed',
                        'status': 'success',
                        'message': f'Container {full_container_name} criado com sucesso!'
                    }))
                else:
                    await self.send(json.dumps({
                        'type': 'action-completed',
                        'status': 'error',
                        'message': f"Erro ao criar container {full_container_name}: {result_container['message']}"
                    }))
                    return
                
                await self.send(json.dumps({
                    'type': 'list-containers',
                    'containers': container.dockeractions.listar_containers_ativos()
                }))

    async def disconnect(self, close_code):
        logger.info(f"Conexão WebSocket encerrada com código: {close_code}")
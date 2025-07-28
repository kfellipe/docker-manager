import xml.etree.ElementTree as ET
import logging
from typing import Optional, List, Dict, Any

# Configuração de logging
logger = logging.getLogger('container.guacamoleactions')

class UserManager:
    def __init__(self, xml_file: str = '/etc/guacamole/user-mapping.xml', debug: bool = True):
        self.xml_file = xml_file
        self.tree = None
        self.root = None
        self.debug = debug
        logger.info(f"Inicializando UserManager para arquivo: {xml_file}")
        self.load_xml()
    
    def debug_print(self, message: str):
        """Imprime mensagens de debug se o modo debug estiver ativado"""
        if self.debug:
            print(f"[DEBUG - GUACAMOLE]: {message}")
        # Sempre loga no arquivo, independente do DEBUG
        logger.debug(f"[DEBUG - GUACAMOLE]: {message}")
    
    def load_xml(self):
        """Carrega o arquivo XML"""
        try:
            logger.info(f"Carregando arquivo XML: {self.xml_file}")
            self.tree = ET.parse(self.xml_file)
            self.root = self.tree.getroot()
            logger.info("Arquivo XML carregado com sucesso")
        except FileNotFoundError:
            logger.warning(f"Arquivo {self.xml_file} não encontrado. Criando novo arquivo...")
            self.debug_print(f"Arquivo {self.xml_file} não encontrado. Criando novo arquivo...")
            self.create_empty_xml()
    
    def create_empty_xml(self):
        """Cria um arquivo XML vazio com a estrutura básica"""
        self.root = ET.Element('user-mapping')
        self.tree = ET.ElementTree(self.root)
    
    def save_xml(self):
        """Salva as alterações no arquivo XML com formatação"""
        # Formatar o XML com indentação
        self._indent_xml(self.root)
        
        self.tree.write(self.xml_file, encoding='utf-8', xml_declaration=True)
        self.debug_print(f"Arquivo {self.xml_file} salvo com sucesso!")
    
    def _indent_xml(self, elem, level=0):
        """Adiciona indentação ao XML para melhor legibilidade"""
        indent = "\n" + level * "    "
        
        if len(elem):
            if not elem.text or not elem.text.strip():
                elem.text = indent + "    "
            if not elem.tail or not elem.tail.strip():
                elem.tail = indent
            for child in elem:
                self._indent_xml(child, level + 1)
            if not elem.tail or not elem.tail.strip():
                elem.tail = indent
        else:
            if level and (not elem.tail or not elem.tail.strip()):
                elem.tail = indent
    
    def listar_usuarios(self) -> List[Dict[str, Any]]:
        """Lista todos os usuários e suas conexões"""
        usuarios = []
        
        for auth in self.root.findall('authorize'):
            username = auth.get('username')
            password = auth.get('password')
            
            conexoes = []
            for conn in auth.findall('connection'):
                conn_name = conn.get('name')
                protocol = conn.find('protocol').text if conn.find('protocol') is not None else 'N/A'
                
                params = {}
                for param in conn.findall('param'):
                    params[param.get('name')] = param.text
                
                conexoes.append({
                    'nome': conn_name,
                    'protocolo': protocol,
                    'parametros': params
                })
            
            usuarios.append({
                'username': username,
                'password': password,
                'conexoes': conexoes
            })
        
        return {"status": "success", "message": "Usuários listados com sucesso", "data": usuarios}
    
    def exibir_usuarios(self):
        """Exibe todos os usuários e suas conexões de forma formatada"""
        usuarios = self.listar_usuarios()
        
        if not usuarios:
            self.debug_print("Nenhum usuário encontrado.")
            return
        
        self.debug_print("\n=== LISTA DE USUÁRIOS ===")
        for usuario in usuarios:
            self.debug_print(f"\nUsuário: {usuario['username']}")
            self.debug_print(f"Senha: {usuario['password']}")

            if usuario['conexoes']:
                self.debug_print("Conexões:")
                for conn in usuario['conexoes']:
                    self.debug_print(f"  - {conn['nome']} ({conn['protocolo']})")
                    for param_name, param_value in conn['parametros'].items():
                        self.debug_print(f"    {param_name}: {param_value}")
            else:
                self.debug_print("  Nenhuma conexão configurada")

    def criar_usuario(self, username: str, password: str) -> bool:
        """Cria um novo usuário"""
        logger.info(f"Criando usuário: {username}")
        # Verifica se o usuário já existe
        if self.buscar_usuario(username) is not None:
            logger.warning(f"Usuário '{username}' já existe!")
            self.debug_print(f"Usuário '{username}' já existe!")
            return {"status": "error", "message": f"Usuário '{username}' já existe!"}
        
        # Cria o novo usuário
        auth_element = ET.SubElement(self.root, 'authorize')
        auth_element.set('username', username)
        auth_element.set('password', password)

        logger.info(f"Usuário '{username}' criado com sucesso!")
        self.debug_print(f"Usuário '{username}' criado com sucesso!")
        return {"status": "success", "message": f"Usuário '{username}' criado com sucesso!"}
    
    def remover_usuario(self, username: str) -> bool:
        """Remove um usuário existente"""
        usuario_element = self.buscar_usuario(username)
        if usuario_element is None:
            self.debug_print(f"Usuário '{username}' não encontrado!")
            return {"status": "error", "message": f"Usuário '{username}' não encontrado!"}
        
        self.root.remove(usuario_element)
        self.debug_print(f"Usuário '{username}' removido com sucesso!")
        return {"status": "success", "message": f"Usuário '{username}' removido com sucesso!"}
    
    def buscar_usuario(self, username: str) -> Optional[ET.Element]:
        """Busca um usuário pelo nome"""
        for auth in self.root.findall('authorize'):
            if auth.get('username') == username:
                return auth
        return None
    
    def adicionar_conexao(self, username: str, conn_name: str, protocol: str, params: Dict[str, str] = None) -> bool:
        """Adiciona uma nova conexão a um usuário existente"""
        if params is None:
            params = {}
            
        usuario_element = self.buscar_usuario(username)
        if usuario_element is None:
            self.debug_print(f"Usuário '{username}' não encontrado!")
            return {"status": "error", "message": f"Usuário '{username}' não encontrado!"}
        
        # Cria a nova conexão
        new_conn = ET.SubElement(usuario_element, 'connection', name=conn_name)
        ET.SubElement(new_conn, 'protocol').text = protocol
        
        # Adiciona os parâmetros
        for param_name, param_value in params.items():
            ET.SubElement(new_conn, 'param', name=param_name).text = str(param_value)

        self.debug_print(f"Conexão '{conn_name}' adicionada ao usuário '{username}'!")
        return {"status": "success", "message": f"Conexão '{conn_name}' adicionada ao usuário '{username}'!"}

    def remover_conexao(self, username: str, conn_name: str) -> bool:
        """Remove uma conexão de um usuário"""
        usuario_element = self.buscar_usuario(username)
        if usuario_element is None:
            self.debug_print(f"Usuário '{username}' não encontrado!")
            return {"status": "error", "message": f"Usuário '{username}' não encontrado!"}
        
        for conn in usuario_element.findall('connection'):
            if conn.get('name') == conn_name:
                usuario_element.remove(conn)
                self.debug_print(f"Conexão '{conn_name}' removida do usuário '{username}'!")
                return {"status": "success", "message": f"Conexão '{conn_name}' removida do usuário '{username}'!"}

        self.debug_print(f"Conexão '{conn_name}' não encontrada para o usuário '{username}'!")
        return {"status": "error", "message": f"Conexão '{conn_name}' não encontrada para o usuário '{username}'!"}
    
    def atualizar_conexao(self, username: str, conn_name: str, new_params: Dict[str, str]) -> bool:
        """Atualiza os parâmetros de uma conexão existente"""
        usuario_element = self.buscar_usuario(username)
        if usuario_element is None:
            self.debug_print(f"Usuário '{username}' não encontrado!")
            return {"status": "error", "message": f"Usuário '{username}' não encontrado!"}
        
        for conn in usuario_element.findall('connection'):
            if conn.get('name') == conn_name:
                # Atualiza os parâmetros
                for param in conn.findall('param'):
                    if param.get('name') in new_params:
                        param.text = str(new_params[param.get('name')])
                
                self.debug_print(f"Conexão '{conn_name}' atualizada para o usuário '{username}'!")
                return {"status": "success", "message": f"Conexão '{conn_name}' atualizada para o usuário '{username}'!"}

        self.debug_print(f"Conexão '{conn_name}' não encontrada para o usuário '{username}'!")
        return {"status": "error", "message": f"Conexão '{conn_name}' não encontrada para o usuário '{username}'!"}
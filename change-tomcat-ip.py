from jinja2 import Environment, FileSystemLoader
import subprocess, re

# Diretório onde está o template
template_dir = './'
template_file = 'server.xml'  # nome do arquivo template

# Carrega o ambiente Jinja2
env = Environment(loader=FileSystemLoader(template_dir))

# Carrega o template
template = env.get_template(template_file)

# Função para obter o endereço IP da interface ens192
def get_ip_address():
    try:
        result = subprocess.run(['ip', 'addr', 'show', 'ens192'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        match = re.search(r'inet (\d+\.\d+\.\d+\.\d+)', result.stdout)
        if match:
            return match.group(1)
        else:
            return None
    except Exception:
        return None

# Dados para renderizar no template
context = {
    'address': get_ip_address()
}

# Renderiza o template com os dados
output = template.render(context)

# Escreve o resultado em outro arquivo
with open('/etc/tomcat9/server.xml', 'w') as f:
    f.write(output)
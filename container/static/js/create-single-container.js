// Single Container Creation Management
console.log('🔍 Procurando elementos .container-type para criação individual...');

// Só atua se estiver na página de criação individual
function initSingleContainerSelection() {
    const singlePage = document.getElementById('create-single-page');
    if (!singlePage) {
        console.log('⚠️ Página de criação individual não encontrada');
        return;
    }
    
    // Procura elementos .container-type apenas dentro da página de criação individual
    const singleContainerTypes = singlePage.querySelectorAll('.container-type');
    console.log('🔍 Elementos encontrados na página individual:', singleContainerTypes.length);

    let selectedSingleType = null;
    let selectedSinglePorts = null;

    // Add event listeners to single container types
    singleContainerTypes.forEach((type, index) => {
        console.log(`🔍 Adicionando listener ao elemento individual ${index}:`, type.dataset.type, 'Porta:', type.dataset.port);
        type.addEventListener('click', () => {
            console.log('🎯 Clicado em (criação individual):', type.dataset.type, 'Porta:', type.dataset.port);
            // Remove selection from all types na página individual
            singleContainerTypes.forEach(t => t.classList.remove('selected'));
            
            // Add selection to clicked type
            type.classList.add('selected');
            selectedSingleType = type.dataset.type;
            // O valor de selectedSinglePorts pode ser uma string com várias portas, então converte para array
            const portData = type.dataset.port || '80';
            selectedSinglePorts = portData.split(',').map(p => parseInt(p.trim()));
            console.log('✅ Selected single container type:', selectedSingleType, 'Ports:', selectedSinglePorts);
            
            // Atualiza as variáveis globais para uso no form
            window.selectedSingleType = selectedSingleType;
            window.selectedSinglePorts = selectedSinglePorts;
        });
    });
    
    return { selectedSingleType, selectedSinglePorts, singleContainerTypes };
}

// Inicializa quando o DOM carregar
document.addEventListener('DOMContentLoaded', function() {
    const singleData = initSingleContainerSelection();
    if (singleData) {
        window.singleContainerData = singleData;
    }
});

let selectedSingleType = null;
let selectedSinglePorts = null;

// Single Container Form Submission
const singleForm = document.getElementById('createSingleContainerForm');
const createSingleBtn = document.getElementById('createSingleBtn');

if (singleForm) {
    singleForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Usa as variáveis globais ou locais
        const currentSelectedType = window.selectedSingleType || selectedSingleType;
        const currentSelectedPorts = window.selectedSinglePorts || selectedSinglePorts;
        
        console.log('📝 Formulário individual submetido com selectedSingleType:', currentSelectedType);
        
        const containerName = document.getElementById('singleContainerName').value.trim();
        const containerNumber = parseInt(document.getElementById('singleContainerNumber').value);
        
        if (!currentSelectedType) {
            console.error('❌ Nenhum tipo de container selecionado para criação individual!');
            alert('Por favor, selecione um tipo de container!');
            return;
        }
        
        if (!containerName) {
            alert('Por favor, digite um nome para o container!');
            return;
        }
        
        if (containerNumber < 1 || containerNumber > 99) {
            alert('O número do container deve estar entre 1 e 99!');
            return;
        }
        
        console.log('✅ Chamando createSingleContainer com:', { 
            name: containerName, 
            number: containerNumber, 
            type: currentSelectedType, 
            ports: currentSelectedPorts 
        });
        createSingleContainer(containerName, containerNumber, currentSelectedType, currentSelectedPorts);
    });
}

function createSingleContainer(name, number, type, ports) {
    try {
        // Garantir que as portas estão definidas
        const currentSelectedPorts = ports || selectedSinglePorts || [80];
        
        console.log('🚀 Criando container individual:', {
            type: type,
            ports: currentSelectedPorts,
            name: name,
            number: number
        });
        
        if (type === 'mysql') {
            // Abre o formModal para MySQL
            const fields = [
                { label: 'Nome do Banco de Dados', type: 'text' },
                { label: 'Usuário', type: 'text' },
                { label: 'Senha', type: 'password' },
                { label: 'Senha do root', type: 'password' }
            ];
            openFormModal("Configurações do MySQL", fields);
        } else if (type === 'nginx') {
            // Apenas confirmação para Nginx
            showConfirmModal(
                `Tem certeza que deseja criar o container "${name}" do tipo Nginx?`,
                function () {
                    console.log('📤 Enviando dados Nginx individual:', { type: type, ports: currentSelectedPorts, name: name });
                    showBlockOverlay("Criando container...", true, 1);
                    ws.send(JSON.stringify({
                        type: 'action',
                        action: 'create-single',
                        container_name: name,
                        container_number: number,
                        container_type: type,
                        port: currentSelectedPorts,
                        configs: {} // Nginx não precisa de configs extras
                    }));
                    closeConfirmModal();
                }
            );
        } else if (type === 'ssh') {
            // Apenas confirmação para SSH
            showConfirmModal(
                `Tem certeza que deseja criar o container "${name}" do tipo SSH?`,
                function () {
                    console.log('📤 Enviando dados SSH individual:', { type: type, ports: currentSelectedPorts, name: name });
                    showBlockOverlay("Criando container...", true, 1);
                    ws.send(JSON.stringify({
                        type: 'action',
                        action: 'create-single',
                        container_name: name,
                        container_number: number,
                        container_type: type,
                        port: currentSelectedPorts,
                        configs: {} // SSH não precisa de configs extras
                    }));
                    closeConfirmModal();
                }
            );
        } else {
            // Fallback para tipos não reconhecidos
            showConfirmModal(
                `Tem certeza que deseja criar o container "${name}" do tipo ${type}?`,
                function () {
                    console.log('📤 Enviando dados genéricos individual:', { type: type, ports: currentSelectedPorts, name: name });
                    showBlockOverlay("Criando container...", true, 1);
                    ws.send(JSON.stringify({
                        type: 'action',
                        action: 'create-single',
                        container_name: name,
                        container_number: number,
                        container_type: type,
                        port: currentSelectedPorts,
                        configs: {}
                    }));
                    closeConfirmModal();
                }
            );
        }
    } catch (error) {
        showToast('Erro ao criar container: ' + error.message, 'error');
    }
}

// Handle form modal submission for single container
document.addEventListener('DOMContentLoaded', function() {
    const modalForm = document.getElementById('modalForm');
    if (modalForm) {
        // Remove existing event listeners to avoid duplicates
        const newForm = modalForm.cloneNode(true);
        modalForm.parentNode.replaceChild(newForm, modalForm);
        
        newForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const containerName = document.getElementById('singleContainerName').value.trim();
            const containerNumber = parseInt(document.getElementById('singleContainerNumber').value);
            const currentSelectedPorts = window.selectedSinglePorts || selectedSinglePorts || [80];
            
            // Coleta os dados dos campos dinâmicos
            const data = {};
            this.querySelectorAll('.dynamic-field input').forEach(input => {
                data[input.name] = input.value;
            });
            
            console.log('📤 Enviando dados Modal MySQL individual:', { type: selectedSingleType, ports: currentSelectedPorts, name: containerName });
            showBlockOverlay("Criando container...", true, 1);
            ws.send(JSON.stringify({
                type: 'action',
                action: 'create-single',
                container_name: containerName,
                container_number: containerNumber,
                container_type: selectedSingleType,
                port: currentSelectedPorts,
                configs: data // Envia os dados coletados
            }));
            
            console.log('Dados enviados para container individual:', data);
            closeFormModal();
        });
    }
});

// Função para resetar seleção de container único
function resetSingleForm() {
    console.log('🔄 Resetando formulário de container único...');
    
    // Limpa campos do formulário
    document.getElementById('singleContainerName').value = '';
    document.getElementById('singleContainerNumber').value = '1';
    
    // Remove seleção apenas da página de criação individual
    const singlePage = document.getElementById('create-single-page');
    if (singlePage) {
        const singleTypes = singlePage.querySelectorAll('.container-type');
        singleTypes.forEach(type => {
            type.classList.remove('selected');
        });
    }
    
    // Reseta variáveis
    selectedSingleType = null;
    selectedSinglePorts = null;
    window.selectedSingleType = null;
    window.selectedSinglePorts = null;
    
    console.log('✅ Formulário de container único resetado');
}

// Função chamada automaticamente quando a página "create-single" é exibida
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('create-single')) {
        resetSingleForm();
    }
});

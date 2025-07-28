// Container Type Selection
console.log('🔍 Procurando elementos .container-type para criação em massa...');

// Só atua se estiver na página de criação em massa
function initMassContainerSelection() {
    const massPage = document.getElementById('create-page');
    if (!massPage) {
        console.log('⚠️ Página de criação em massa não encontrada');
        return;
    }
    
    // Procura elementos .container-type apenas dentro da página de criação em massa
    const containerTypes = massPage.querySelectorAll('.container-type');
    console.log('🔍 Elementos encontrados na página em massa:', containerTypes.length);

    let selectedType = null;
    let selectedPorts = null;

    containerTypes.forEach((type, index) => {
        console.log(`🔍 Adicionando listener ao elemento massa ${index}:`, type.dataset.type, 'Porta:', type.dataset.port);
        type.addEventListener('click', () => {
            console.log('🎯 Clicado em (criação em massa):', type.dataset.type, 'Porta:', type.dataset.port);
            // Remove selection from all types na página em massa
            containerTypes.forEach(t => t.classList.remove('selected'));
            
            // Add selection to clicked type
            type.classList.add('selected');
            selectedType = type.dataset.type;
            // O valor de selectedPorts pode ser uma string com várias portas, então converte para array
            const portData = type.dataset.port || '80';
            selectedPorts = portData.split(',').map(p => parseInt(p.trim()));
            console.log('✅ Selected container type:', selectedType, 'Port:', selectedPorts);
            
            // Atualiza as variáveis globais para uso no form
            window.selectedType = selectedType;
            window.selectedPorts = selectedPorts;
        });
    });

    return { selectedType, selectedPorts, containerTypes };
}

// Inicializa quando o DOM carregar
document.addEventListener('DOMContentLoaded', function() {
    const massData = initMassContainerSelection();
    if (massData) {
        window.massContainerData = massData;
    }
});

let selectedType = null;
let selectedPorts = null;

// Form Submission
const form = document.getElementById('createContainersForm');
const createBtn = document.getElementById('createBtn');
const containerPort = document.getElementById('containerPort');
const containerCountInput = document.getElementById('containerCountInput');
const containerPrefixInput = document.getElementById('containerPrefix');
const prefixPreview = document.getElementById('prefixPreview');

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Usa as variáveis globais ou locais
    const currentSelectedType = window.selectedType || selectedType;
    const currentSelectedPorts = window.selectedPorts || selectedPorts;

    console.log('📝 Formulário em massa submetido com selectedType:', currentSelectedType);
    
    let containerMax = containerCountInput.value.trim();
    if (!currentSelectedType) {
        console.error('❌ Nenhum tipo de container selecionado!');
        alert('Por favor, selecione um tipo de container!');
        return;
    }

    if (containerMax < 1 || containerMax > 50) {
        alert('A quantidade deve estar entre 1 e 50 containers!');
        return;
    }

    console.log('✅ Chamando createContainers com:', { count: containerMax, type: currentSelectedType });
    createContainers(containerMax, currentSelectedType);
});

function createContainers(count, selectedType) {
    try {
        // Garantir que a porta está definida
        const currentSelectedPort = window.selectedPorts || selectedPorts || 80;
        
        console.log('🚀 Criando containers:', {
            type: selectedType,
            port: currentSelectedPort,
            count: count
        });
        
        if (selectedType === 'mysql') {
            // Abre o formModal para MySQL
            const fields = [
                { label: 'Nome do Banco de Dados', type: 'text' },
                { label: 'Usuário', type: 'text' },
                { label: 'Senha', type: 'password' },
                { label: 'Senha do root', type: 'password' }
            ];
            openFormModal("Configurações do MySQL", fields);
        } else if (selectedType === 'nginx') {
            // Apenas confirmação para Nginx
            showConfirmModal(
                `Tem certeza que deseja criar ${count} container(s) do tipo Nginx?`,
                function () {
                    const name_prefix = containerPrefixInput.value.trim() || 'container';
                    const port = currentSelectedPort;
                    console.log('📤 Enviando dados Nginx:', { type: selectedType, port: port, count: count });
                    showBlockOverlay("Criando os containers selecionados...", true, parseInt(count));
                    ws.send(JSON.stringify({
                        type: 'action',
                        action: 'create',
                        container_type: 'nginx',
                        count: parseInt(count),
                        name_prefix: name_prefix,
                        port: port,
                        configs: {}
                    }));
                    closeConfirmModal();
                }
            );
        } else if (selectedType === 'ssh') {
            // Apenas confirmação para SSH
            showConfirmModal(
                `Tem certeza que deseja criar ${count} container(s) do tipo SSH?`,
                function () {
                    const name_prefix = containerPrefixInput.value.trim() || 'container';
                    const port = currentSelectedPort;
                    console.log('📤 Enviando dados SSH:', { type: selectedType, port: port, count: count });
                    showBlockOverlay("Criando os containers selecionados...", true, parseInt(count));
                    ws.send(JSON.stringify({
                        type: 'action',
                        action: 'create',
                        container_type: 'ssh',
                        count: parseInt(count),
                        name_prefix: name_prefix,
                        port: port,
                        configs: {}
                    }));
                    closeConfirmModal();
                }
            );
        } else {
            // Fallback para tipos não reconhecidos
            showConfirmModal(
                `Tem certeza que deseja criar ${count} container(s) do tipo ${selectedType}?`,
                function () {
                    const name_prefix = containerPrefixInput.value.trim() || 'container';
                    const port = currentSelectedPort;
                    console.log('📤 Enviando dados genéricos:', { type: selectedType, port: port, count: count });
                    showBlockOverlay("Criando os containers selecionados...", true, parseInt(count));
                    ws.send(JSON.stringify({
                        type: 'action',
                        action: 'create',
                        container_type: selectedType,
                        count: parseInt(count),
                        name_prefix: name_prefix,
                        port: port,
                        configs: {}
                    }));
                    closeConfirmModal();
                }
            );
        }
    } catch (error) {
        showToast('Erro ao criar containers: ' + error.message, 'error');
    }
}

function resetForm() {
    document.getElementById('containerCountInput').value = '1';
    
    // Remove seleção apenas da página de criação em massa
    const massPage = document.getElementById('create-page');
    if (massPage) {
        const containerTypes = massPage.querySelectorAll('.container-type');
        containerTypes.forEach(t => t.classList.remove('selected'));
    }
    
    selectedType = null;
    selectedPorts = null;
    window.selectedType = null;
    window.selectedPorts = null;
    
    console.log('🔄 Formulário de criação em massa resetado');
}

// Input validation
containerCountInput.addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    if (value > 50) {
        e.target.value = 50;
        alert('Máximo de 50 containers permitidos por vez!');
    } else if (value < 1) {
        e.target.value = 1;
    }
});

function updatePrefixPreview() {
    const prefix = containerPrefixInput.value.trim() || 'container';
    let count = parseInt(containerCountInput.value) || 1;
    count = Math.max(1, Math.min(count, 50));
    let preview = [];
    for (let i = 1; i <= Math.min(count, 3); i++) {
        preview.push(`${prefix}-${i}`);
    }
    if (count > 3) preview.push('...');
    prefixPreview.textContent = `Exemplo: ${preview.join(', ')}`;
}

containerPrefixInput.addEventListener('input', updatePrefixPreview);
containerCountInput.addEventListener('input', updatePrefixPreview);

// Chame ao carregar a página para inicializar
updatePrefixPreview();

function openFormModal(title = "Título do Formulário", fields = []) {
    const formModal = document.getElementById('formModal');
    const formTitle = document.getElementById('formModalTitle');
    const form = document.getElementById('modalForm');

    formTitle.textContent = title;

    // Remove campos antigos, mantendo apenas o título e botões
    form.querySelectorAll('.dynamic-field').forEach(el => el.remove());

    // Adiciona campos dinamicamente
    fields.forEach((field, idx) => {
        const div = document.createElement('div');
        div.className = 'form-group dynamic-field';
        div.style.marginBottom = '1rem';

        const label = document.createElement('label');
        label.style = "margin-bottom:2rem; color:#1e293b; font-size:1.1rem;"
        label.className = 'form-label';
        label.htmlFor = `modalInput${idx}`;
        label.textContent = field.label;

        const input = document.createElement('input');
        input.type = field.type || 'text';
        input.className = 'form-input';
        input.id = `modalInput${idx}`;
        input.name = `modalInput${idx}`;
        input.placeholder = field.label;

        div.appendChild(label);
        div.appendChild(input);
        // Adiciona antes dos botões (assumindo que os botões estão no final do form)
        form.insertBefore(div, form.lastElementChild);
    });

    formModal.style.display = 'flex';
}

function closeFormModal() {
    document.getElementById('formModal').style.display = 'none';
}

document.getElementById('modalForm').addEventListener('submit', function(e) {
    let type = window.selectedType || selectedType;
    let port = window.selectedPorts || selectedPorts || 80; // Garantir fallback
    let name_prefix = containerPrefixInput.value.trim() || 'container';
    let count = containerCountInput.value.trim();

    e.preventDefault();

    console.log('📤 Enviando dados Modal MySQL:', { type: type, port: port, count: count });

    // Coleta os dados dos campos dinâmicos
    const data = {};
    this.querySelectorAll('.dynamic-field input').forEach(input => {
        data[input.name] = input.value;
    });
    showBlockOverlay("Criando os containers selecionados...", true, parseInt(count));
    ws.send(JSON.stringify({
            type: 'action',
            action: 'create',
            container_type: type,
            count: parseInt(count),
            name_prefix: name_prefix,
            port: port,
            configs: data
        }));
    console.log('Dados enviados:', { type, port, configs: data });
    closeFormModal();

});

function closeConfirmModal() {
    document.getElementById('confirmModal').style.display = 'none';
}
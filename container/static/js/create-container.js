// Container Type Selection
const containerTypes = document.querySelectorAll('.container-type');
let selectedType = null;
let selectedPort = null;

containerTypes.forEach(type => {
    type.addEventListener('click', () => {
        // Remove selection from all types
        containerTypes.forEach(t => t.classList.remove('selected'));
        
        // Add selection to clicked type
        type.classList.add('selected');
        selectedType = type.dataset.type;
        selectedPort = type.dataset.port;
        
        console.log('Selected container type:', selectedType, 'Port:', selectedPort);
    });
});

// Form Submission
const form = document.getElementById('createContainersForm');
const createBtn = document.getElementById('createBtn');
const containerPort = document.getElementById('containerPort');
const containerCountInput = document.getElementById('containerCountInput');
const containerPrefixInput = document.getElementById('containerPrefix');
const prefixPreview = document.getElementById('prefixPreview');

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    let containerMax = containerCountInput.value.trim();
    if (!selectedType) {
        alert('Por favor, selecione um tipo de container!');
        return;
    }

    if (containerMax < 1 || containerMax > 50) {
        alert('A quantidade deve estar entre 1 e 50 containers!');
        return;
    }

    createContainers(containerMax, selectedType);
});

function createContainers(count, selectedType) {
    try {
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
                    // Envie a ação via WebSocket ou sua lógica aqui
                    const name_prefix = containerPrefixInput.value.trim() || 'container';
                    const port = selectedPort;
                    showBlockOverlay("Criando os containers selecionados...");
                    ws.send(JSON.stringify({
                        type: 'action',
                        action: 'create',
                        container_type: 'nginx',
                        count: parseInt(count),
                        name_prefix: name_prefix,
                        port: port,
                        configs: {} // Nginx não precisa de configs extras
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
    containerTypes.forEach(t => t.classList.remove('selected'));
    selectedType = null;
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
    let type = selectedType;
    let port = selectedPort;
    let name_prefix = containerPrefixInput.value.trim() || 'container';
    let count = containerCountInput.value.trim();

    e.preventDefault();

    // Coleta os dados dos campos dinâmicos
    const data = {};
    this.querySelectorAll('.dynamic-field input').forEach(input => {
        data[input.name] = input.value;
    });
    showBlockOverlay("Criando os containers selecionados...");
    ws.send(JSON.stringify({
            type: 'action',
            action: 'create',
            container_type: type,
            count: parseInt(count),
            name_prefix: name_prefix,
            port: port,
            configs: data // Envia os dados coletados
        }));
    console.log('Dados enviados:', data);
    closeFormModal();

});

function closeConfirmModal() {
    document.getElementById('confirmModal').style.display = 'none';
}
// Conexão WebSocket global
let ws = null;

function updateContainerList(containers) {
    // Atualiza a tabela de containers
    const tableBody = document.querySelector('.table tbody');
    tableBody.innerHTML = ''; // Limpa a tabela antes de adicionar novos dados
    // Conta quantos containers foram recebidos
    let containerCount = containers.length;
    // Conta quantos containers estão rodando
    let runningCount = containers.filter(c => c.status === 'running').length;
    // Atualiza o contador de containers
    document.getElementById('containerCount').textContent = `${containerCount}`;
    document.getElementById('containerRunningCount').textContent = `${runningCount}`;
    document.getElementById('containerStoppedCount').textContent = `${containerCount - runningCount}`;
    containers.forEach(container => {
        let ports = '';
        if (container.ports[0] == null || container.ports[0] == undefined) {
            ports = 'N/A';
        } else {
            ports = container.ports.map(port => {
                return `${port}<br>`;
            });
        }
        let containerStatus = '';
        if (container.status === 'running') {
            containerStatus = 'running';
        } else {
            containerStatus = 'stopped';
        }
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="checkbox-cell">
                <input type="checkbox" data-container-id="${container.id}" class="container-checkbox" name="container_names" value="${container.nome}" onchange="updateSelection()">
            </td>
            <td class="container-name">${container.nome}</td>
            <td>${container.imagem}</td>
            <td>
                <span class="status-badge status-${containerStatus}">
                    ${container.status}
                </span>
            </td>
            <td class="ports">
                ${ports}
            </td>
        `;
        tableBody.appendChild(row);
    });
    
    updateSelection(); // Atualiza a seleção após atualizar a tabela
    
    document.querySelectorAll('.table tbody tr').forEach(row => {
        row.addEventListener('click', function(e) {
            // Evita conflito se clicar diretamente no checkbox
            if (e.target.type === 'checkbox') return;
            const checkbox = this.querySelector('.container-checkbox[data-container-id]');
            if (checkbox) {
                checkbox.checked = !checkbox.checked;
                updateSelection();
            }
        });
    });
    hideBlockOverlay();
}

function connectWebSocket() {
    ws = new WebSocket('ws://192.168.17.82:8000/ws/docker');

    ws.onopen = function() {
        console.log('WebSocket conectado');
    };

    ws.onclose = function() {
        console.error('WebSocket fechado. Tentando reconectar...');
        setTimeout(connectWebSocket, 3000);
    };

    ws.onerror = function(error) {
        console.error('WebSocket error: ', error);
        settimeout(connectWebSocket, 3000);
    };

    ws.onmessage = function(event) {
        // Trate mensagens recebidas do servidor aqui, se necessário
        data = JSON.parse(event.data);
        // console.log('Mensagem recebida: ', data);
        if (data['type'] == 'list-containers'){
            updateContainerList(data['containers']);
        }
        // Exemplo de tratamento de resposta:
        if (data.type === 'action-result') {
            hideBlockOverlay();
            if (data.status === 'success') {
                showToast(data.message, 'success');
            } else {
                showToast(data.message, 'error');
            }
            // setBulkButtonsDisabled(false); // Reativa os botões
        }

        if (data.type === 'refresh-containers') {
            // Atualiza a tabela de containers
            updateContainerList(data.containers);
            showToast('Lista de containers atualizada com sucesso!', 'success');
        };
    }
}

// Conectar ao carregar a página
connectWebSocket();


// Container Selection Management
function getSelectedContainers() {
    const checkboxes = document.querySelectorAll('.container-checkbox[data-container-id]');
    const selected = [];
    
    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            selected.push(checkbox.dataset.containerId);
        }
    });
    
    return selected;
}

function updateSelection() {
    const selectedContainers = getSelectedContainers();
    const selectedCount = selectedContainers.length;
    
    // Update selection count
    document.getElementById('selectedCount').textContent = selectedCount;
    
    // Enable/disable bulk action buttons
    const bulkButtons = document.querySelectorAll('.bulk-btn');
    bulkButtons.forEach(btn => {
        btn.disabled = selectedCount === 0;
    });
    
    // Update select all checkbox
    const allCheckboxes = document.querySelectorAll('.container-checkbox[data-container-id]');
    const selectAllCheckbox = document.getElementById('selectAll');
    
    if (selectedCount === 0) {
        selectAllCheckbox.indeterminate = false;
        selectAllCheckbox.checked = false;
    } else if (selectedCount === allCheckboxes.length) {
        selectAllCheckbox.indeterminate = false;
        selectAllCheckbox.checked = true;
    } else {
        selectAllCheckbox.indeterminate = true;
    }
    
    // Update row highlighting
    allCheckboxes.forEach(checkbox => {
        const row = checkbox.closest('tr');
        if (checkbox.checked) {
            row.classList.add('selected');
        } else {
            row.classList.remove('selected');
        }
    });
}

function toggleSelectAll() {
    const selectAllCheckbox = document.getElementById('selectAll');
    const containerCheckboxes = document.querySelectorAll('.container-checkbox[data-container-id]');
    
    containerCheckboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });
    
    updateSelection();
}

// Bulk Actions
function bulkStartContainers() {
    const selectedContainers = getSelectedContainers();
    if (selectedContainers.length === 0) {
        alert('Selecione pelo menos um container!');
        return;
    }
    showConfirmModal("Tem certeza que deseja iniciar os containers selecionados?", function () {
        showBlockOverlay("Iniciando containers selecionados...");
        ws.send(JSON.stringify({
            type: 'action',
            action: 'start',
            containers: selectedContainers
        }));
        showToast('Iniciando containers...', 'info');
        clearAllContainerCheckboxes(); // Limpa a seleção após enviar a ação
        // console.log('Iniciando containers:', selectedContainers);

    })

}

function bulkStopContainers() {
    const selectedContainers = getSelectedContainers();
    if (selectedContainers.length === 0) {
        showToast('Selecione pelo menos um container!', 'error');
        return;
    }
    showConfirmModal("Tem certeza que deseja parar os containers selecionados?", function () {
        showBlockOverlay("Parando containers selecionados...");
        ws.send(JSON.stringify({
            type: 'action',
            action: 'stop',
            containers: selectedContainers
        }));
        showToast('Parando containers...', 'info');
        clearAllContainerCheckboxes(); // Limpa a seleção após enviar a ação
        // console.log('Parando containers:', selectedContainers);
    });
}

function bulkRestartContainers() {
    const selectedContainers = getSelectedContainers();
    if (selectedContainers.length === 0) {
        alert('Selecione pelo menos um container!');
        return;
    }
    
    showConfirmModal("Tem certeza que deseja reiniciar os containers selecionados?", function () {
        showBlockOverlay("Parando containers selecionados...");
        ws.send(JSON.stringify({
            type: 'action',
            action: 'restart',
            containers: selectedContainers
        }));
        showToast('Parando containers...', 'info');
        clearAllContainerCheckboxes(); // Limpa a seleção após enviar a ação
        // console.log('Parando containers:', selectedContainers);
    });
}

function bulkDeleteContainers() {
    const selectedContainers = getSelectedContainers();
    if (selectedContainers.length === 0) {
        showToast('Selecione pelo menos um container!', 'error');
        return;
    }

    showConfirmModal("Tem certeza que deseja remover os containers selecionados?", function () {
        showBlockOverlay("Parando containers selecionados...");
        ws.send(JSON.stringify({
            type: 'action',
            action: 'delete',
            containers: selectedContainers
        }));
        showToast('Parando containers...', 'info');
        clearAllContainerCheckboxes(); // Limpa a seleção após enviar a ação
        // console.log('Parando containers:', selectedContainers);
    });
}

function refreshContainers() {
    showBlockOverlay("Atualizando lista de containers...");
    ws.send(JSON.stringify({
        type: 'action',
        action: 'refresh'
    }));
    clearAllContainerCheckboxes(); // Limpa a seleção após enviar a ação
}

// Container Type Selection
const containerTypes = document.querySelectorAll('.container-type');
let selectedType = null;

containerTypes.forEach(type => {
    type.addEventListener('click', () => {
        // Remove selection from all types
        containerTypes.forEach(t => t.classList.remove('selected'));
        
        // Add selection to clicked type
        type.classList.add('selected');
        selectedType = type.dataset.type;
        
        console.log('Selected container type:', selectedType);
    });
});

// Form Submission
const form = document.getElementById('createContainersForm');
const createBtn = document.getElementById('createBtn');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const containerPrefixInput = document.getElementById('containerPrefix');
const containerCountInput = document.getElementById('containerCount');
const prefixPreview = document.getElementById('prefixPreview');

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const containerCount = document.getElementById('containerCount').value;
    
    if (!selectedType) {
        alert('Por favor, selecione um tipo de container!');
        return;
    }

    if (containerCount < 1 || containerCount > 50) {
        alert('A quantidade deve estar entre 1 e 50 containers!');
        return;
    }

    await createContainers(containerCount, selectedType);
});

async function createContainers(count, type) {
    // Disable form
    createBtn.disabled = true;
    createBtn.innerHTML = '⏳ Criando...';
    progressContainer.style.display = 'block';

    const containerConfigs = {
        nginx: { image: 'nginx:latest', ports: '80' },
        mysql: { image: 'mysql:8.0', ports: '3306' },
        postgres: { image: 'postgres:13', ports: '5432' },
        redis: { image: 'redis:alpine', ports: '6379' },
        ssh: { image: 'linuxserver/openssh-server', ports: '2222' },
        node: { image: 'node:16-alpine', ports: '3000' },
        python: { image: 'python:3.9-slim', ports: '8000' },
        apache: { image: 'httpd:latest', ports: '80' }
    };

    const config = containerConfigs[type];
    
    try {
        const containerIds = [];
        
        for (let i = 1; i <= count; i++) {
            // Simulate container creation
            const progress = (i / count) * 100;
            progressFill.style.width = `${progress}%`;
            progressText.textContent = `Criando container ${i} de ${count}...`;
            
            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const containerId = `${type}-${Date.now()}-${i}`;
            containerIds.push(containerId);
            
            console.log(`Container ${i} criado:`, {
                id: containerId,
                name: `${type}-${i}`,
                image: config.image,
                ports: config.ports
            });
        }

        // Success
        progressText.textContent = `✅ ${count} containers criados com sucesso!`;
        progressFill.style.backgroundColor = 'var(--success-color)';
        
        console.log('IDs dos containers criados:', containerIds);
        
        setTimeout(() => {
            alert(`${count} containers do tipo "${type}" foram criados com sucesso!\n\nIDs: ${containerIds.join(', ')}`);
            resetForm();
            showPage('dashboard'); // Redirect to dashboard after creation
        }, 1000);

    } catch (error) {
        console.error('Erro ao criar containers:', error);
        progressText.textContent = '❌ Erro ao criar containers';
        progressFill.style.backgroundColor = 'var(--danger-color)';
        alert('Erro ao criar containers. Tente novamente.');
    } finally {
        // Re-enable form
        setTimeout(() => {
            createBtn.disabled = false;
            createBtn.innerHTML = '🚀 Criar Containers';
            progressContainer.style.display = 'none';
            progressFill.style.backgroundColor = 'var(--accent-color)';
            progressFill.style.width = '0%';
        }, 2000);
    }
}

function resetForm() {
    document.getElementById('containerCount').value = '1';
    containerTypes.forEach(t => t.classList.remove('selected'));
    selectedType = null;
    progressContainer.style.display = 'none';
    progressFill.style.width = '0%';
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

// Initialize navigation and selection
document.getElementById('dashboard-link').classList.add('active');
updateSelection();

function showToast(message, type='success', duration=4000) {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.style.padding = '1rem 1.5rem';
    toast.style.borderRadius = '8px';
    toast.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)';
    toast.style.color = '#fff';
    toast.style.fontWeight = '500';
    toast.style.fontSize = '1rem';
    toast.style.background = type === 'success' ? 'var(--success-color, #10b981)' :
                            type === 'info' ? 'var(--info-color, #2563eb)' :
                            'var(--danger-color, #ef4444)';
    toast.style.opacity = '0.95';
    toast.style.marginBottom = '4px';

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 400); // Tempo igual ao transition do CSS
    }, duration);
}

function showConfirmModal(message, onConfirm) {
    document.getElementById('confirmModalText').textContent = message;
    document.getElementById('confirmModal').style.display = 'flex';

    const yesBtn = document.getElementById('confirmModalYes');
    const noBtn = document.getElementById('confirmModalNo');

    function cleanup() {
        document.getElementById('confirmModal').style.display = 'none';
        yesBtn.removeEventListener('click', onYes);
        noBtn.removeEventListener('click', onNo);
    }

    function onYes() {
        cleanup();
        if (typeof onConfirm === 'function') onConfirm();
    }
    function onNo() {
        cleanup();
    }

    yesBtn.addEventListener('click', onYes);
    noBtn.addEventListener('click', onNo);
}

function clearAllContainerCheckboxes() {
    document.querySelectorAll('.container-checkbox[data-container-id]').forEach(cb => {
        cb.checked = false;
    });
    updateSelection();
}

function showBlockOverlay(message = "Aguarde, processando ação...") {
    const overlay = document.getElementById('blockOverlay');
    overlay.style.display = 'flex';
    overlay.querySelector('div').textContent = message;
}

function hideBlockOverlay() {
    document.getElementById('blockOverlay').style.display = 'none';
}
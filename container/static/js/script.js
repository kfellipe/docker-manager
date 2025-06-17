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
            closeFormModal(); // Fecha o modal de criação de container, se aberto
            closeConfirmModal(); // Fecha o modal de confirmação, se aberto
            updateContainerList(data['containers']);
        }
        // Exemplo de tratamento de resposta:
        if (data.type === 'action-result') {
            closeFormModal(); // Fecha o modal de criação de container, se aberto
            closeConfirmModal(); // Fecha o modal de confirmação, se aberto
            hideBlockOverlay();
            if (data.status === 'success') {
                showPage('dashboard'); // Volta para o dashboard após ação
                showToast(data.message, 'success');
            } else {
                showPage('dashboard'); // Volta para o dashboard após ação
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

// Initialize navigation and selection
document.getElementById('dashboard-link').classList.add('active');
// updateSelection();

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

function showBlockOverlay(message = "Aguarde, processando ação...") {
    const overlay = document.getElementById('blockOverlay');
    overlay.style.display = 'flex';
    overlay.querySelector('div').textContent = message;
}

function hideBlockOverlay() {
    document.getElementById('blockOverlay').style.display = 'none';
}
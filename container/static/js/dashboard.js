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
        showToast('Selecione pelo menos um container!', 'error');
        return;
    }
    
    showConfirmModal("Tem certeza que deseja reiniciar os containers selecionados?", function () {
        showBlockOverlay("Reiniciando containers selecionados...");
        ws.send(JSON.stringify({
            type: 'action',
            action: 'restart',
            containers: selectedContainers
        }));
        showToast('Reiniciando containers...', 'info');
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

function clearAllContainerCheckboxes() {
    document.querySelectorAll('.container-checkbox[data-container-id]').forEach(cb => {
        cb.checked = false;
    });
    updateSelection();
}



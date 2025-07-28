// Conexão WebSocket global
let ws = null;

// Sistema de progresso
let progressTracker = {
    total: 0,
    current: 0,
    operation: '',
    isActive: false
};

function initializeProgress(total, operation) {
    console.log('🚀 Inicializando progresso:', { total, operation });
    
    // Reset do tracker
    progressTracker = {
        total: parseInt(total),
        current: 0,
        operation: operation,
        isActive: true
    };
    
    const progressContainer = document.getElementById('progressContainer');
    console.log('🔍 Elemento progressContainer encontrado:', !!progressContainer);
    
    if (progressContainer) {
        // Força a exibição com display block
        progressContainer.style.display = 'block';
        progressContainer.style.visibility = 'visible';
        progressContainer.style.opacity = '1';
        
        console.log('✅ progressContainer styles aplicados');
        console.log('🔍 Classes do progressContainer:', progressContainer.className);
        console.log('🔍 Computeds styles:', window.getComputedStyle(progressContainer).display);
        
        // Verifica se os elementos filhos existem
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');
        
        console.log('🔍 progressBar encontrado:', !!progressBar);
        console.log('🔍 progressText encontrado:', !!progressText);
        
        if (progressBar) {
            console.log('🔍 Classes do progressBar:', progressBar.className);
        }
        
        // Força a atualização inicial para mostrar 0/total
        updateProgressDisplay();
        
        // Timeout para verificar visibilidade
        setTimeout(() => {
            const isVisible = progressContainer.offsetHeight > 0 && 
                             progressContainer.offsetWidth > 0;
            console.log('🔍 progressContainer é visível?', isVisible);
            console.log('🔍 Dimensões:', {
                height: progressContainer.offsetHeight,
                width: progressContainer.offsetWidth,
                display: window.getComputedStyle(progressContainer).display
            });
        }, 100);
        
    } else {
        console.error('❌ progressContainer não encontrado no DOM!');
        // Lista todos os elementos com ID similar
        const allElements = document.querySelectorAll('[id*="progress"]');
        console.log('🔍 Elementos com "progress" no ID:', Array.from(allElements).map(el => el.id));
    }
}

function updateProgress() {
    console.log('📈 Atualizando progresso. Estado atual:', progressTracker);
    
    if (!progressTracker.isActive) {
        console.log('⚠️ Progress tracker não está ativo');
        return;
    }
    
    // Incrementa o contador
    progressTracker.current++;
    console.log(`📊 Progresso: ${progressTracker.current}/${progressTracker.total}`);
    
    // Atualiza a exibição
    updateProgressDisplay();
    
    // Verifica se chegou ao final
    if (progressTracker.current >= progressTracker.total) {
        console.log('🏁 Progresso individual concluído - todos os containers processados');
        console.log('⏳ Aguardando mensagem action-completed do servidor para fechar...');
        // NÃO finaliza aqui - deixa para o action-completed fazer isso
    }
}

function updateProgressDisplay() {
    const percentage = progressTracker.total > 0 ? (progressTracker.current / progressTracker.total) * 100 : 0;
    
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    
    if (progressBar) {
        progressBar.style.width = `${percentage}%`;
        console.log(`📊 Barra atualizada para ${percentage.toFixed(1)}% (${progressTracker.current}/${progressTracker.total})`);
    } else {
        console.error('❌ progressBar não encontrado!');
    }
    
    if (progressText) {
        progressText.textContent = `${progressTracker.current} de ${progressTracker.total} containers processados`;
        console.log(`📝 Texto atualizado: ${progressTracker.current}/${progressTracker.total}`);
    } else {
        console.error('❌ progressText não encontrado!');
    }
}

function finishProgress() {
    console.log('🏁 Finalizando progresso - operação completamente concluída');
    console.log('📊 Estado final:', progressTracker);
    
    progressTracker.isActive = false;
    const progressContainer = document.getElementById('progressContainer');
    if (progressContainer) {
        progressContainer.style.display = 'none';
        console.log('✅ progressContainer ocultado após conclusão');
    } else {
        console.error('❌ progressContainer não encontrado ao finalizar');
    }
}

// Função de teste para verificar se todos os elementos existem
function testProgressElements() {
    console.log('🧪 Testando elementos de progresso...');
    
    const elements = [
        'blockOverlay',
        'overlayMessage', 
        'progressContainer',
        'progressBar',
        'progressText'
    ];
    
    elements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            console.log(`✅ ${id}: encontrado`);
        } else {
            console.error(`❌ ${id}: NÃO encontrado!`);
        }
    });
    
    // Teste rápido da barra de progresso
    console.log('🧪 Testando progresso com 5 itens...');
    showBlockOverlay("Teste de progresso", true, 5);
    
    // Simula o progresso
    setTimeout(() => {
        console.log('🧪 Simulando progresso 1/5...');
        updateProgress();
    }, 1000);
    
    setTimeout(() => {
        console.log('🧪 Simulando progresso 2/5...');
        updateProgress();
    }, 2000);
    
    setTimeout(() => {
        console.log('🧪 Simulando progresso 3/5...');
        updateProgress();
    }, 3000);
    
    setTimeout(() => {
        console.log('🧪 Simulando progresso 4/5...');
        updateProgress();
    }, 4000);
    
    setTimeout(() => {
        console.log('🧪 Simulando progresso 5/5...');
        updateProgress();
    }, 5000);
    
    setTimeout(() => {
        console.log('🧪 Finalizando teste...');
        hideBlockOverlay();
    }, 6000);
}

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
        let address = '';
        
        // Agora os campos ports e endereco vêm separados do backend
        if (container.ports && container.ports.length > 0) {
            ports = container.ports;
        } else {
            ports = 'N/A';
        }
        
        if (container.endereco) {
            address = container.endereco;
        } else {
            address = 'N/A';
        }
        
        let containerStatus = '';
        if (container.status === 'running') {
            containerStatus = 'running';
        } else {
            containerStatus = 'stopped';
        }
        
        const row = document.createElement('tr');
        // Para cada porta no array, pula uma linha
        row.innerHTML = `
            <td class="checkbox-cell">
                <input type="checkbox" data-container-id="${container.id}" class="container-checkbox" name="container_names" value="${container.nome}" onchange="updateSelection()">
            </td>
            <td class="container-name">${container.nome}</td>
            <td>${Array.isArray(container.imagem) ? container.imagem.join(', ') : container.imagem}</td>
            <td>
                <span class="status-badge status-${containerStatus}">
                    ${container.status}
                </span>
            </td>
            <td class="ports">
                ${(Array.isArray(ports) ? ports : [ports]).map(port => {
                    return `<div>${port}</div>`;
                }).join('')}
            </td>
            <td class="addresses">
                ${address}
            </td>
            <td>
                <button type="button" class="btn btn-primary btn-vscode" onclick="showVsCodeConfig('${address}', '${container.nome}', event)"><img src='/static/images/vscode.png'></button>
            </td>
        `;
        tableBody.appendChild(row);
    });
    
    updateSelection(); // Atualiza a seleção após atualizar a tabela
    
    document.querySelectorAll('.table tbody tr').forEach(row => {
        row.addEventListener('click', function(e) {
            // Evita conflito se clicar diretamente no checkbox
            if (e.target.type === 'checkbox') return;
            
            // Evita conflito se clicar no botão VSCode ou na imagem dentro dele
            if (e.target.classList.contains('btn-vscode') || 
                e.target.closest('.btn-vscode') || 
                e.target.tagName === 'IMG' && e.target.closest('.btn-vscode')) {
                return;
            }
            
            const checkbox = this.querySelector('.container-checkbox[data-container-id]');
            if (checkbox) {
                checkbox.checked = !checkbox.checked;
                updateSelection();
            }
        });
    });
    
    // NÃO chama hideBlockOverlay() aqui - só esconde se não houver progresso ativo
    if (!progressTracker.isActive) {
        console.log('📦 Ocultando overlay - não há progresso ativo');
        hideBlockOverlay();
    } else {
        console.log('📊 Mantendo overlay - progresso ainda ativo:', progressTracker);
    }
}

function connectWebSocket() {
    ws = new WebSocket('ws://192.168.17.195:8000/ws/docker');

    ws.onopen = function() {
        console.log('WebSocket conectado');
        
        // Testa a disponibilidade de funções importantes
        console.log('🧪 Testando disponibilidade de funções:');
        console.log('🔍 showPage:', typeof showPage);
        console.log('🔍 showToast:', typeof showToast);
        console.log('🔍 hideBlockOverlay:', typeof hideBlockOverlay);
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
        console.log('📨 Mensagem recebida:', data.type, data); // Log ativado para debug
        
        if (data['type'] == 'list-containers'){
            console.log('🔄 Atualizando lista de containers... Progresso ativo?', progressTracker.isActive);
            closeFormModal(); // Fecha o modal de criação de container, se aberto
            closeConfirmModal(); // Fecha o modal de confirmação, se aberto
            
            // Só atualiza a lista se não estivermos em progresso ativo
            // Durante operações em massa, a lista só será atualizada no final
            if (!progressTracker.isActive) {
                updateContainerList(data['containers']);
            } else {
                console.log('📊 Pulando atualização da lista - operação em progresso');
            }
        }
        
        // Tratamento para mensagens de progresso individual (ex: container individual sendo apagado)
        if (data.type === 'action-progress') {
            console.log('📈 Progresso da ação recebida:', data);
            
            // Atualiza o progresso SEMPRE (independente de ter mensagem ou não)
            console.log('🔄 Chamando updateProgress...');
            updateProgress();
            
            // Só mostra toast se tiver mensagem E não for muito frequente
            if (data.message && data.status !== 'info') {
                showToast(data.message, data.status || 'success', 2500); // Toast mais rápido
            }
            
            // NÃO atualiza a lista aqui para não causar conflitos - deixa para action-completed
        }
        
        // Exemplo de tratamento de resposta:
        if (data.type === 'action-result') {
            // console.log('✅ Resultado da ação recebida:', data);
            closeFormModal(); // Fecha o modal de criação de container, se aberto
            closeConfirmModal(); // Fecha o modal de confirmação, se aberto
            // hideBlockOverlay();
            if (data.status === 'success') {
                console.log('🔄 Sucesso em action-result - executando redirecionamento...');
                if (typeof showPage === 'function') {
                    showPage('dashboard'); // Volta para o dashboard após ação
                    console.log('✅ Redirecionamento executado após action-result (sucesso)');
                } else {
                    console.error('❌ showPage não disponível em action-result (sucesso)');
                }
                showToast(data.message, 'success');
            } else {
                console.log('🔄 Erro em action-result - executando redirecionamento...');
                if (typeof showPage === 'function') {
                    showPage('dashboard'); // Volta para o dashboard após ação
                    console.log('✅ Redirecionamento executado após action-result (erro)');
                } else {
                    console.error('❌ showPage não disponível em action-result (erro)');
                }
                showToast(data.message, 'error');
            }
            // setBulkButtonsDisabled(false); // Reativa os botões
        }
        
        if (data.type === 'action-completed') {
            // Ação concluída com sucesso
            console.log('🏁 Ação concluída - finalizando progresso e overlay:', data);
            closeFormModal(); // Fecha o modal de criação de container, se aberto
            closeConfirmModal(); // Fecha o modal de confirmação, se aberto
            hideBlockOverlay(); // Agora sim, fecha o overlay
            
            // Mostra toast baseado no status
            if (data.status === 'success') {
                showToast(data.message, 'success');
                // Redireciona para o dashboard após sucesso
                console.log('🔄 Preparando redirecionamento para dashboard...');
                console.log('🔍 Verificando função showPage:', typeof showPage);
                console.log('🔍 Função showPage existe:', typeof showPage === 'function');
                
                setTimeout(() => {
                    console.log('⏰ Executando redirecionamento...');
                    if (typeof showPage === 'function') {
                        console.log('✅ Chamando showPage("dashboard")');
                        showPage('dashboard');
                        console.log('✅ showPage("dashboard") executado');
                    } else {
                        console.error('❌ Função showPage não está disponível!');
                        console.error('❌ Tipo da função:', typeof showPage);
                        // Fallback: força redirecionamento manualmente
                        document.querySelectorAll('.page-section').forEach(page => {
                            page.classList.remove('active');
                        });
                        document.getElementById('dashboard-page').classList.add('active');
                        document.querySelectorAll('.nav-link').forEach(link => {
                            link.classList.remove('active');
                        });
                        document.getElementById('dashboard-link').classList.add('active');
                        console.log('✅ Redirecionamento manual executado');
                    }
                }, 1000); // Aguarda 1 segundo para o usuário ver o toast
            } else if (data.status === 'warning') {
                showToast(data.message, 'warning');
                // Redireciona para o dashboard após warning
                setTimeout(() => {
                    if (typeof showPage === 'function') {
                        showPage('dashboard');
                    } else {
                        // Fallback manual
                        document.querySelectorAll('.page-section').forEach(page => {
                            page.classList.remove('active');
                        });
                        document.getElementById('dashboard-page').classList.add('active');
                        document.querySelectorAll('.nav-link').forEach(link => {
                            link.classList.remove('active');
                        });
                        document.getElementById('dashboard-link').classList.add('active');
                    }
                }, 1000);
            } else {
                showToast(data.message, 'error');
            }
            
            if (data.containers) {
                updateContainerList(data.containers); // Atualiza a lista de containers
            }
        }

        if (data.type === 'refresh-containers') {
            // Atualiza a tabela de containers
            // console.log('🔄 Refresh de containers:', data);
            updateContainerList(data.containers);
            showToast('Lista de containers atualizada com sucesso!', 'success');
        }
        
        // Tratamento genérico para outros tipos de mensagem que possam existir
        if (!['list-containers', 'action-result', 'action-completed', 'refresh-containers', 'action-progress'].includes(data.type)) {
            console.log('❓ Tipo de mensagem não tratada:', data.type, data);
            // Se tem mensagem, mostra como toast
            if (data.message) {
                showToast(data.message, data.status || 'info');
            }
            // Se tem containers, atualiza a lista
            if (data.containers) {
                updateContainerList(data.containers);
            }
        }
    }
}

// Função de teste para o redirecionamento
function testRedirection() {
    console.log('🧪 Testando redirecionamento...');
    console.log('🔍 Função showPage disponível:', typeof showPage === 'function');
    
    if (typeof showPage === 'function') {
        console.log('✅ Executando teste de redirecionamento para dashboard...');
        showPage('dashboard');
        console.log('✅ Teste de redirecionamento concluído');
    } else {
        console.error('❌ Função showPage não está disponível para teste');
    }
}

// Aguarda o DOM carregar completamente antes de fazer testes
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM carregado completamente');
    
    // Testa se todos os elementos essenciais existem
    const essentialElements = [
        'dashboard-page',
        'dashboard-link',
        'create-page',
        'create-link',
        'create-single-page', 
        'create-single-link'
    ];
    
    console.log('🧪 Verificando elementos essenciais...');
    essentialElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            console.log(`✅ ${id}: encontrado`);
        } else {
            console.error(`❌ ${id}: NÃO encontrado!`);
        }
    });
    
    // Testa se a função showPage está disponível
    console.log('🧪 Verificando função showPage:', typeof showPage === 'function');
    
    // Testa uma chamada da função showPage
    if (typeof showPage === 'function') {
        console.log('🧪 Testando navegação para dashboard...');
        showPage('dashboard');
        console.log('✅ Teste de navegação concluído');
    }
    
    // Depois de todos os testes, conecta o WebSocket
    setTimeout(() => {
        connectWebSocket();
    }, 100);
    
    // Initialize navigation and selection
    const dashboardLink = document.getElementById('dashboard-link');
    if (dashboardLink) {
        dashboardLink.classList.add('active');
        console.log('✅ Dashboard link ativado');
    } else {
        console.error('❌ Dashboard link não encontrado');
    }
});

function showToast(message, type = 'info', duration = 5000) {
    const toastContainer = document.getElementById('toastContainer');
    
    // Criar elemento do toast
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    toast.innerHTML = `
        <div class="toast-content">
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="closeToast(this)">×</button>
        </div>
        <div class="toast-progress"></div>
    `;
    
    // Adicionar ao container
    toastContainer.appendChild(toast);
    
    // Animar entrada
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    // Configurar animação da barra de progresso
    const progressBar = toast.querySelector('.toast-progress');
    let progressAnimation = null;
    
    // Criar pseudo-elemento para animação
    const progressFill = document.createElement('div');
    
    // Definir cor da barra de progresso baseada no tipo do toast
    let progressColor = 'rgba(255, 255, 255, 0.9)'; // Padrão
    let progressShadow = 'rgba(255, 255, 255, 0.5)'; // Padrão
    
    switch(type) {
        case 'success':
            progressColor = 'rgba(255, 255, 255, 0.95)';
            progressShadow = 'rgba(255, 255, 255, 0.7)';
            break;
        case 'error':
            progressColor = 'rgba(255, 255, 255, 0.95)';
            progressShadow = 'rgba(255, 255, 255, 0.7)';
            break;
        case 'warning':
            progressColor = 'rgba(255, 255, 255, 0.95)';
            progressShadow = 'rgba(255, 255, 255, 0.7)';
            break;
        case 'info':
            progressColor = 'rgba(255, 255, 255, 0.95)';
            progressShadow = 'rgba(255, 255, 255, 0.7)';
            break;
    }
    
    progressFill.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: ${progressColor};
        transform-origin: left;
        box-shadow: 0 0 8px ${progressShadow};
    `;
    progressBar.appendChild(progressFill);
    
    // Iniciar animação da barra de progresso
    const startProgressAnimation = () => {
        progressAnimation = progressFill.animate([
            { transform: 'scaleX(1)' },
            { transform: 'scaleX(0)' }
        ], {
            duration: duration,
            easing: 'linear',
            fill: 'forwards'
        });
    };
    
    // Controle de timer para auto-remoção
    let autoRemoveTimer;
    let startTime = Date.now();
    let pausedTime = 0;
    let isPaused = false;
    
    const startAutoRemove = () => {
        const remainingTime = duration - pausedTime;
        autoRemoveTimer = setTimeout(() => {
            closeToast(toast.querySelector('.toast-close'));
        }, remainingTime);
    };
    
    // Iniciar timer e animação
    startAutoRemove();
    startProgressAnimation();
    
    // Pausar timer ao hover
    toast.addEventListener('mouseenter', () => {
        if (!isPaused) {
            clearTimeout(autoRemoveTimer);
            pausedTime += Date.now() - startTime;
            isPaused = true;
            
            // Pausar animação da barra de progresso
            if (progressAnimation) {
                progressAnimation.pause();
            }
        }
    });
    
    // Retomar timer ao sair do hover
    toast.addEventListener('mouseleave', () => {
        if (isPaused) {
            startTime = Date.now();
            isPaused = false;
            
            // Retomar animação da barra de progresso
            if (progressAnimation) {
                progressAnimation.play();
            }
            
            // Reiniciar timer com tempo restante
            startAutoRemove();
        }
    });
    
    return toast;
}

function closeToast(closeButton) {
    const toast = closeButton.closest('.toast');
    if (toast) {
        toast.classList.remove('show');
        toast.classList.add('hide');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }
}

// Funções específicas para cada tipo de toast
function showSuccessToast(message, duration = 5000) {
    return showToast(message, 'success', duration);
}

function showErrorToast(message, duration = 7000) {
    return showToast(message, 'error', duration);
}

function showWarningToast(message, duration = 6000) {
    return showToast(message, 'warning', duration);
}

function showInfoToast(message, duration = 5000) {
    return showToast(message, 'info', duration);
}

// Função para mostrar o overlay de bloqueio
function showBlockOverlay(message, showProgress = false, totalItems = 0) {
    console.log('🔄 Mostrando overlay:', message, 'progresso:', showProgress, 'itens:', totalItems);
    
    const overlay = document.getElementById('blockOverlay');
    const messageEl = document.getElementById('overlayMessage');
    const progressContainer = document.getElementById('progressContainer');
    const progressText = document.getElementById('progressText');
    
    if (!overlay || !messageEl) {
        console.error('❌ Elementos do overlay não encontrados!');
        return;
    }
    
    messageEl.textContent = message;
    
    if (showProgress && totalItems > 0) {
        if (progressContainer && progressText) {
            progressContainer.style.display = 'block';
            progressText.textContent = `0 de ${totalItems} containers processados`;
            // Reset progress tracker
            progressTracker.current = 0;
            progressTracker.total = totalItems;
            progressTracker.isActive = true;
        }
    } else {
        if (progressContainer) {
            progressContainer.style.display = 'none';
        }
        progressTracker.isActive = false;
    }
    
    overlay.style.display = 'flex';
}

// Função para esconder o overlay de bloqueio
function hideBlockOverlay() {
    console.log('✅ Escondendo overlay');
    const overlay = document.getElementById('blockOverlay');
    const progressContainer = document.getElementById('progressContainer');
    
    if (overlay) {
        overlay.style.display = 'none';
    }
    
    if (progressContainer) {
        progressContainer.style.display = 'none';
    }
    
    // Reset progress tracker
    progressTracker.isActive = false;
    progressTracker.current = 0;
    progressTracker.total = 0;
}

// Função para mostrar modal de confirmação
function showConfirmModal(message, onConfirm, onCancel = null) {
    console.log('❓ Mostrando modal de confirmação:', message);
    
    const modal = document.getElementById('confirmModal');
    const modalText = document.getElementById('confirmModalText');
    const yesBtn = document.getElementById('confirmModalYes');
    const noBtn = document.getElementById('confirmModalNo');
    
    if (!modal || !modalText || !yesBtn || !noBtn) {
        console.error('❌ Elementos do modal de confirmação não encontrados!');
        return;
    }
    
    modalText.textContent = message;
    
    // Remove listeners anteriores
    const newYesBtn = yesBtn.cloneNode(true);
    const newNoBtn = noBtn.cloneNode(true);
    yesBtn.parentNode.replaceChild(newYesBtn, yesBtn);
    noBtn.parentNode.replaceChild(newNoBtn, noBtn);
    
    // Adiciona novos listeners
    newYesBtn.addEventListener('click', () => {
        closeConfirmModal();
        if (typeof onConfirm === 'function') {
            onConfirm();
        }
    });
    
    newNoBtn.addEventListener('click', () => {
        closeConfirmModal();
        if (typeof onCancel === 'function') {
            onCancel();
        }
    });
    
    modal.style.display = 'flex';
}

// Função para fechar modal de confirmação
function closeConfirmModal() {
    console.log('✅ Fechando modal de confirmação');
    const modal = document.getElementById('confirmModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Função para fechar modal de formulário
function closeFormModal() {
    console.log('✅ Fechando modal de formulário');
    const modal = document.getElementById('formModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Tracker de progresso global (já declarado no início do arquivo)
// progressTracker já existe

// Função para atualizar progresso
function updateProgress() {
    if (!progressTracker.isActive) return;
    
    progressTracker.current++;
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    
    if (progressBar && progressText) {
        const percentage = (progressTracker.current / progressTracker.total) * 100;
        progressBar.style.width = percentage + '%';
        progressText.textContent = `${progressTracker.current} de ${progressTracker.total} containers processados`;
        
        console.log(`📊 Progresso atualizado: ${progressTracker.current}/${progressTracker.total} (${percentage.toFixed(1)}%)`);
    }
}

// Tutorial steps configuration for each page
const tutorialSteps = {
    'dashboard': [
        {
            element: '#dashboard-page .page-title, #dashboard-page h1',
            text: 'Bem-vindo ao Dashboard! Aqui você pode ver um resumo de todos os seus containers Docker.',
        },
        {
            element: '.stats-grid, #dashboard-page .stats-grid',
            text: 'Estas estatísticas mostram quantos containers estão rodando, parados e o total geral.',
        },
        {
            element: '.table-container, #dashboard-page .table-container',
            text: 'Esta é a tabela de containers. Veja o status, portas, endereços e gerencie cada container individualmente.',
        },
        {
            element: '.bulk-actions, #dashboard-page .bulk-actions',
            text: 'Aqui estão as informações de seleção. Quando você selecionar containers, verá quantos estão selecionados.',
        },
        {
            element: '.bulk-buttons, #dashboard-page .bulk-buttons',
            text: 'Aqui estão os botões de ação em massa. Selecione containers na tabela e execute ações em vários containers ao mesmo tempo.',
        },
        {
            element: '#selectAll, .checkbox-cell input[type="checkbox"]',
            text: 'Use esta caixa de seleção no cabeçalho para selecionar/deselecionar todos os containers de uma vez.',
        }
    ],
    'create': [
        {
            element: '#create-page .page-header, #create-page .page-title',
            text: 'Esta é a página de criação em massa. Aqui você pode criar múltiplos containers de uma só vez.',
        },
        {
            element: '#containerPrefix, label[for="containerPrefix"], #create-page .form-group:first-of-type',
            text: 'Defina o prefixo para os nomes dos containers. Exemplo: "aluno" criará containers como aluno-01, aluno-02, etc.',
        },
        {
            element: '#containerCountInput, label[for="containerCount"], #create-page .form-group:nth-of-type(2)',
            text: 'Especifique quantos containers você deseja criar simultaneamente (máximo 50).',
        },
        {
            element: '.container-types, .container-type, #create-page .form-group:nth-of-type(3)',
            text: 'Selecione o tipo de container que deseja criar. Atualmente temos o XAMP com Apache, MySQL e PHP.',
        },
        {
            element: '.form-actions, #createBtn, #create-page .form-actions',
            text: 'Clique aqui para iniciar a criação em massa dos containers ou limpar o formulário.',
        }
    ],
    'create-single': [
        {
            element: '#create-single-page .page-header, #create-single-page .page-title',
            text: 'Esta é a página de criação individual. Aqui você pode criar um container específico com configurações personalizadas.',
        },
        {
            element: '#create-single-page .form-group:first-child, #singleContainerName',
            text: 'Defina o nome específico para este container único.',
        },
        {
            element: '#create-single-page .form-group:nth-child(2), #singleContainerNumber',
            text: 'Escolha o número que será usado para este container (de 1 a 99).',
        },
        {
            element: '#create-single-page .form-group:nth-child(3), #create-single-page .container-types',
            text: 'Selecione o tipo de container. Atualmente disponível: XAMP com Apache, MySQL e PHP.',
        },
        {
            element: '#create-single-page .form-actions, #createSingleBtn',
            text: 'Clique aqui para criar o container individual ou limpar o formulário.',
        }
    ]
};

let currentStep = 0;
let tutorialActive = false;
let currentPage = 'dashboard'; // Página atual

// Função para detectar a página atual
function getCurrentPage() {
    // Primeiro, tenta encontrar a seção ativa
    const activePage = document.querySelector('.page-section.active');
    if (activePage) {
        const pageId = activePage.id.replace('-page', '');
        console.log('🎯 Página ativa detectada:', pageId, 'elemento:', activePage.id);
        return pageId;
    }
    
    // Fallback: verifica todas as seções para ver qual está visível
    const sections = ['dashboard-page', 'create-page', 'create-single-page'];
    for (const sectionId of sections) {
        const section = document.getElementById(sectionId);
        if (section && (section.style.display !== 'none' && !section.classList.contains('hidden'))) {
            const pageId = sectionId.replace('-page', '');
            console.log('🎯 Página detectada por visibilidade:', pageId);
            return pageId;
        }
    }
    
    console.log('⚠️ Nenhuma página detectada, usando dashboard como padrão');
    return 'dashboard'; // Default
}

// Função de debug para listar elementos disponíveis
function debugTutorialElements() {
    console.log('🔍 Debug: Elementos disponíveis para tutorial na página:', getCurrentPage());
    
    const currentPageSteps = tutorialSteps[getCurrentPage()];
    if (!currentPageSteps) {
        console.log('❌ Nenhum passo definido para esta página');
        return;
    }
    
    console.log('📋 Lista completa de elementos da página:');
    currentPageSteps.forEach((step, index) => {
        const element = findElement(step.element);
        console.log(`${index + 1}. ${element ? '✅' : '❌'} "${step.element}" ${element ? '(encontrado)' : '(não encontrado)'}`);
        
        if (!element) {
            // Vamos testar cada seletor individualmente
            const selectors = step.element.split(',').map(s => s.trim());
            selectors.forEach(selector => {
                const testElement = document.querySelector(selector);
                console.log(`   ↳ "${selector}": ${testElement ? '✅ encontrado' : '❌ não encontrado'}`);
            });
        }
    });
    
    // Debug adicional específico para cada página
    if (getCurrentPage() === 'create') {
        console.log('🔍 Debug específico para página CREATE:');
        console.log('- #create-page existe?', !!document.querySelector('#create-page'));
        console.log('- #create-page está ativa?', !!document.querySelector('#create-page.active'));
        
        // Testa elementos específicos de cada passo
        console.log('🔍 Elementos por passo:');
        console.log('- Passo 1: #create-page .page-title:', !!document.querySelector('#create-page .page-title'));
        console.log('- Passo 2: #create-page .form-group:first-child:', !!document.querySelector('#create-page .form-group:first-child'));
        console.log('- Passo 2: #containerPrefix:', !!document.querySelector('#containerPrefix'));
        console.log('- Passo 2: .form-group:first-of-type:', !!document.querySelector('#create-page .form-group:first-of-type'));
        console.log('- Passo 3: #containerCountInput:', !!document.querySelector('#containerCountInput'));
        console.log('- Passo 3: .form-group:nth-of-type(2):', !!document.querySelector('#create-page .form-group:nth-of-type(2)'));
        console.log('- Passo 4: .container-types:', !!document.querySelector('.container-types'));
        console.log('- Passo 4: .form-group:nth-of-type(3):', !!document.querySelector('#create-page .form-group:nth-of-type(3)'));
        console.log('- Passo 5: .form-actions:', !!document.querySelector('.form-actions'));
        console.log('- Passo 5: #createBtn:', !!document.querySelector('#createBtn'));
        
        // Mostra as posições dos elementos para verificar se estão corretos
        const formGroups = document.querySelectorAll('#create-page .form-group');
        console.log('� Form groups encontrados:', formGroups.length);
        formGroups.forEach((group, index) => {
            const rect = group.getBoundingClientRect();
            console.log(`📐 Form group ${index + 1}:`, { 
                top: rect.top, 
                left: rect.left, 
                width: rect.width, 
                height: rect.height,
                content: group.querySelector('label')?.textContent?.substring(0, 30) + '...'
            });
        });
        
        // Testa especificamente os elementos problemáticos dos passos 4 e 5
        console.log('🔍 Debug específico dos passos 4 e 5:');
        const containerTypesEl = document.querySelector('.container-types');
        const formActionsEl = document.querySelector('.form-actions');
        const createBtnEl = document.querySelector('#createBtn');
        
        if (containerTypesEl) {
            const rect = containerTypesEl.getBoundingClientRect();
            console.log('📐 .container-types posição:', { 
                top: rect.top, 
                left: rect.left, 
                width: rect.width, 
                height: rect.height,
                parent: containerTypesEl.parentElement?.className
            });
        }
        
        if (formActionsEl) {
            const rect = formActionsEl.getBoundingClientRect();
            console.log('📐 .form-actions posição:', { 
                top: rect.top, 
                left: rect.left, 
                width: rect.width, 
                height: rect.height,
                children: formActionsEl.children.length
            });
        }
        
        if (createBtnEl) {
            const rect = createBtnEl.getBoundingClientRect();
            console.log('📐 #createBtn posição:', { 
                top: rect.top, 
                left: rect.left, 
                width: rect.width, 
                height: rect.height,
                text: createBtnEl.textContent?.trim()
            });
        }
    }
    
    if (getCurrentPage() === 'create-single') {
        console.log('🔍 Debug específico para página CREATE-SINGLE:');
        console.log('- #create-single-page existe?', !!document.querySelector('#create-single-page'));
        console.log('- #create-single-page está ativa?', !!document.querySelector('#create-single-page.active'));
        
        // Testa elementos específicos de cada passo
        console.log('🔍 Elementos por passo:');
        console.log('- Passo 1: #create-single-page .page-title:', !!document.querySelector('#create-single-page .page-title'));
        console.log('- Passo 2: #singleContainerName:', !!document.querySelector('#singleContainerName'));
        console.log('- Passo 3: #singleContainerNumber:', !!document.querySelector('#singleContainerNumber'));
        console.log('- Passo 4: #create-single-page .container-types:', !!document.querySelector('#create-single-page .container-types'));
        console.log('- Passo 5: #createSingleBtn:', !!document.querySelector('#createSingleBtn'));
    }
    
    if (getCurrentPage() === 'dashboard') {
        console.log('🔍 Debug específico para página DASHBOARD:');
        console.log('- #dashboard-page existe?', !!document.querySelector('#dashboard-page'));
        console.log('- #dashboard-page está ativa?', !!document.querySelector('#dashboard-page.active'));
        
        // Testa elementos específicos de cada passo
        console.log('🔍 Elementos por passo:');
        console.log('- Passo 1: #dashboard-page .page-title:', !!document.querySelector('#dashboard-page .page-title'));
        console.log('- Passo 2: .stats-grid:', !!document.querySelector('.stats-grid'));
        console.log('- Passo 3: .table-container:', !!document.querySelector('.table-container'));
        console.log('- Passo 4: .bulk-actions:', !!document.querySelector('.bulk-actions'));
        console.log('- Passo 5: .bulk-buttons:', !!document.querySelector('.bulk-buttons'));
        console.log('- Passo 6: #selectAll:', !!document.querySelector('#selectAll'));
    }
}

// Função para testar todos os seletores de tutorial
function testAllTutorialSelectors() {
    console.log('🧪 Testando todos os seletores de tutorial...');
    
    Object.keys(tutorialSteps).forEach(pageKey => {
        console.log(`\n🔍 Testando página: ${pageKey}`);
        const steps = tutorialSteps[pageKey];
        
        steps.forEach((step, index) => {
            console.log(`\n  Passo ${index + 1}: "${step.text.substring(0, 50)}..."`);
            const element = findElement(step.element);
            
            if (element) {
                const rect = element.getBoundingClientRect();
                console.log(`  ✅ Elemento encontrado:`, {
                    tagName: element.tagName,
                    id: element.id,
                    classes: Array.from(element.classList).join('.'),
                    visible: rect.width > 0 && rect.height > 0,
                    position: { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
                });
            } else {
                console.log(`  ❌ Elemento NÃO encontrado para seletores: ${step.element}`);
            }
        });
    });
    
    console.log('\n🧪 Teste de seletores concluído!');
}

function startTutorial() {
    currentPage = getCurrentPage();
    console.log('🎓 Iniciando tutorial para a página:', currentPage);
    
    // Verifica se existe tutorial para a página atual
    if (!tutorialSteps[currentPage]) {
        showErrorToast(`Tutorial não disponível para a página atual: ${currentPage}`);
        return;
    }
    
    // Reset completo do tutorial
    currentStep = 0;
    tutorialActive = true;
    
    // Remove elementos de tutorial anteriores se existirem
    removeTutorialElements();
    
    console.log('🎯 Começando tutorial do zero, passo 0');
    showTutorialStep(0);
}

// Função auxiliar para encontrar um elemento usando múltiplos seletores
function findElement(selectors) {
    const selectorList = selectors.split(',').map(s => s.trim());
    
    console.log('🔍 Procurando elemento com seletores:', selectorList);
    
    for (const selector of selectorList) {
        try {
            const element = document.querySelector(selector);
            if (element) {
                console.log('✅ Elemento encontrado com seletor:', selector);
                console.log('📐 Elemento encontrado:', {
                    tagName: element.tagName,
                    id: element.id,
                    classList: Array.from(element.classList),
                    textContent: element.textContent?.substring(0, 50) + '...'
                });
                return element;
            } else {
                console.log('❌ Seletor sem resultado:', selector);
            }
        } catch (error) {
            console.log('⚠️ Erro ao processar seletor:', selector, error.message);
        }
    }
    
    console.log('❌ Nenhum elemento encontrado com os seletores:', selectors);
    return null;
}

function showTutorialStep(stepIdx) {
    console.log('🎯 Mostrando passo do tutorial:', stepIdx, 'página:', currentPage);
    
    // Remove elementos anteriores
    removeTutorialElements();

    const pageSteps = tutorialSteps[currentPage];
    if (!pageSteps || stepIdx >= pageSteps.length || stepIdx < 0) {
        console.error('❌ Passo do tutorial inválido:', stepIdx, 'para página:', currentPage);
        endTutorial();
        return;
    }

    const step = pageSteps[stepIdx];
    console.log('🔍 Procurando elemento:', step.element);
    
    let target = findElement(step.element);
    
    // Se não encontrar o elemento, tenta aguardar um pouco (elemento pode estar carregando)
    if (!target) {
        console.warn('⚠️ Elemento não encontrado inicialmente:', step.element);
        console.log('🔄 Aguardando elemento aparecer...');
        
        setTimeout(() => {
            target = findElement(step.element);
            if (!target) {
                console.error('❌ Elemento definitivamente não encontrado:', step.element);
                console.log('🔍 Tentando encontrar próximo elemento disponível...');
                
                // Procura o próximo elemento disponível
                let nextValidStep = findNextValidStep(stepIdx);
                if (nextValidStep !== -1) {
                    currentStep = nextValidStep;
                    showTutorialStep(nextValidStep);
                } else {
                    console.log('🏁 Nenhum elemento válido encontrado, finalizando tutorial');
                    endTutorial();
                }
                return;
            }
            
            // Elemento encontrado após aguardar
            console.log('✅ Elemento encontrado após aguardar:', step.element);
            renderTutorialStep(stepIdx, step, target);
        }, 500);
        return;
    }

    // Elemento encontrado imediatamente
    console.log('✅ Elemento encontrado:', step.element);
    renderTutorialStep(stepIdx, step, target);
}

// Função auxiliar para encontrar o próximo passo válido
function findNextValidStep(currentStepIdx) {
    const pageSteps = tutorialSteps[currentPage];
    
    for (let i = currentStepIdx + 1; i < pageSteps.length; i++) {
        const element = findElement(pageSteps[i].element);
        if (element) {
            console.log('✅ Próximo elemento válido encontrado no passo:', i);
            return i;
        }
    }
    
    console.log('❌ Nenhum elemento válido encontrado após o passo:', currentStepIdx);
    return -1;
}

// Função auxiliar para renderizar o passo do tutorial
function renderTutorialStep(stepIdx, step, target) {
    const pageSteps = tutorialSteps[currentPage];
    
    // Atualiza o currentStep para o passo atual sendo mostrado
    currentStep = stepIdx;
    
    console.log(`🎯 Renderizando passo ${stepIdx + 1}/${pageSteps.length} para elemento:`, target);
    console.log('📐 Elemento selecionado:', {
        tagName: target.tagName,
        id: target.id,
        classList: Array.from(target.classList),
        textContent: target.textContent?.substring(0, 50) + '...'
    });
    
    // Scroll para o elemento se necessário
    target.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'center' 
    });

    // Aguarda o scroll completar antes de mostrar o tutorial
    setTimeout(() => {
        // Get target position and size após o scroll
        const rect = target.getBoundingClientRect();
        console.log('📐 Posição do elemento alvo:', { 
            top: rect.top, 
            left: rect.left, 
            width: rect.width, 
            height: rect.height,
            bottom: rect.bottom,
            right: rect.right
        });

        // Create focus highlight com margem extra para elementos pequenos
        const focus = document.createElement('div');
        focus.className = 'tutorial-focus';
        
        // Adiciona margem extra para elementos pequenos ou específicos
        let focusMargin = 8;
        
        // Tratamento especial para form-groups - usa margem menor
        if (target.classList.contains('form-group') || target.closest('.form-group')) {
            focusMargin = 4; // Margem menor para form-groups
        } else if (rect.width < 100 || rect.height < 40) {
            focusMargin = 16; // Margem maior para elementos pequenos
        }
        
        // Para elementos de input, foca no form-group pai se existir
        let actualTarget = target;
        if (target.tagName === 'INPUT' && target.closest('.form-group')) {
            actualTarget = target.closest('.form-group');
            const newRect = actualTarget.getBoundingClientRect();
            focus.style.top = (newRect.top - focusMargin) + 'px';
            focus.style.left = (newRect.left - focusMargin) + 'px';
            focus.style.width = (newRect.width + focusMargin * 2) + 'px';
            focus.style.height = (newRect.height + focusMargin * 2) + 'px';
            console.log('📐 Focando no form-group pai do input:', {
                original: target.tagName + '#' + target.id,
                parent: actualTarget.tagName + '.' + Array.from(actualTarget.classList).join('.')
            });
        } else {
            focus.style.top = (rect.top - focusMargin) + 'px';
            focus.style.left = (rect.left - focusMargin) + 'px';
            focus.style.width = (rect.width + focusMargin * 2) + 'px';
            focus.style.height = (rect.height + focusMargin * 2) + 'px';
        }
        document.body.appendChild(focus);

        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'tutorial-overlay';
        document.body.appendChild(overlay);

        // Create tutorial box
        const box = document.createElement('div');
        box.className = 'tutorial-box';
        
        // Título da página atual
        const pageTitle = {
            'dashboard': 'Dashboard',
            'create': 'Criação em Massa',
            'create-single': 'Criação Individual'
        };
        
        console.log('📊 Renderizando passo', stepIdx + 1, 'de', pageSteps.length);
        
        box.innerHTML = `
            <div class="tutorial-header">
                <h3>${pageTitle[currentPage] || 'Tutorial'}</h3>
                <span class="tutorial-progress">${stepIdx + 1} de ${pageSteps.length}</span>
            </div>
            <div class="tutorial-content">${step.text}</div>
            <div class="tutorial-btns">
                ${stepIdx > 0 ? '<button class="tutorial-btn tutorial-btn-secondary" onclick="prevTutorialStep()">← Voltar</button>' : ''}
                ${stepIdx < pageSteps.length - 1 ? '<button class="tutorial-btn tutorial-btn-primary" onclick="nextTutorialStep()">Próximo →</button>' : '<button class="tutorial-btn tutorial-btn-success" onclick="endTutorial()">✓ Concluir</button>'}
                <button class="tutorial-btn tutorial-btn-outline" onclick="endTutorial()">Pular Tutorial</button>
            </div>
        `;
        
        // Posicionamento inteligente do box
        const boxWidth = 400;
        const boxHeight = 200; // Estimativa da altura
        
        let boxTop = rect.bottom + 20;
        let boxLeft = rect.left;
        
        // Se o elemento está na metade inferior da tela, posiciona acima
        if (rect.top > window.innerHeight / 2) {
            boxTop = rect.top - boxHeight - 20;
            console.log('📐 Posicionando acima do elemento (elemento na parte inferior)');
        } else {
            console.log('📐 Posicionando abaixo do elemento (elemento na parte superior)');
        }
        
        // Ajusta horizontalmente para não sair da tela
        const rightEdge = boxLeft + boxWidth;
        if (rightEdge > window.innerWidth) {
            boxLeft = window.innerWidth - boxWidth - 24;
            console.log('📐 Ajustando posição horizontal para não sair da tela');
        }
        
        // Garante que não fica muito na esquerda
        if (boxLeft < 24) {
            boxLeft = 24;
            console.log('📐 Ajustando posição horizontal mínima');
        }
        
        // Ajusta verticalmente se necessário
        if (boxTop < 24) {
            boxTop = 24;
            console.log('📐 Ajustando posição vertical mínima');
        } else if (boxTop + boxHeight > window.innerHeight - 24) {
            boxTop = window.innerHeight - boxHeight - 24;
            console.log('📐 Ajustando posição vertical máxima');
        }
        
        box.style.top = boxTop + 'px';
        box.style.left = boxLeft + 'px';
        document.body.appendChild(box);
        
        console.log('📐 Posição final do tutorial box:', { top: boxTop, left: boxLeft });
        console.log('✅ Tutorial passo', stepIdx + 1, 'renderizado com sucesso');
    }, 300); // Aguarda o scroll
}

function removeTutorialElements() {
    document.querySelectorAll('.tutorial-overlay, .tutorial-focus, .tutorial-box').forEach(el => el.remove());
}

function nextTutorialStep() {
    console.log('➡️ Próximo passo solicitado. Passo atual:', currentStep);
    const pageSteps = tutorialSteps[currentPage];
    
    if (currentStep < pageSteps.length - 1) {
        const nextStep = currentStep + 1;
        console.log('➡️ Indo para o passo:', nextStep);
        showTutorialStep(nextStep);
    } else {
        console.log('🏁 Último passo alcançado, finalizando tutorial');
        endTutorial();
    }
}

function prevTutorialStep() {
    console.log('⬅️ Passo anterior solicitado. Passo atual:', currentStep);
    
    if (currentStep > 0) {
        const prevStep = currentStep - 1;
        console.log('⬅️ Voltando para o passo:', prevStep);
        showTutorialStep(prevStep);
    } else {
        console.log('⬅️ Já está no primeiro passo');
    }
}

function endTutorial() {
    console.log('🏁 Finalizando tutorial da página:', currentPage);
    tutorialActive = false;
    removeTutorialElements();
    
    const pageNames = {
        'dashboard': 'Dashboard',
        'create': 'Criação em Massa',
        'create-single': 'Criação Individual'
    };
    
    const pageName = pageNames[currentPage] || currentPage;
    showSuccessToast(`Tutorial "${pageName}" concluído!`, 3000);
    
    // Reset das variáveis
    currentStep = 0;
}

// Exemplo: Adicione um botão para iniciar o tutorial
document.addEventListener('DOMContentLoaded', function() {
    const btn = document.createElement('button');
    btn.id = 'tutorialBtn';
    btn.innerHTML = '❓ Tutorial';
    btn.className = 'btn btn-secondary';
    btn.style.cssText = `
        position: fixed;
        bottom: 32px;
        right: 32px;
        z-index: 100002;
        background: #3b82f6;
        color: white;
        border: none;
        border-radius: 8px;
        padding: 12px 16px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        transition: all 0.3s ease;
    `;
    
    // Hover effects
    btn.addEventListener('mouseenter', () => {
        btn.style.transform = 'translateY(-2px)';
        btn.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4)';
    });
    
    btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'translateY(0)';
        btn.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
    });
    
    btn.onclick = function() {
        const currentPageName = getCurrentPage();
        const pageNames = {
            'dashboard': 'Dashboard',
            'create': 'Criação em Massa',
            'create-single': 'Criação Individual'
        };
        
        console.log('🎓 Tutorial solicitado para a página:', currentPageName);
        
        // Debug dos elementos disponíveis
        debugTutorialElements();
        
        if (tutorialSteps[currentPageName]) {
            startTutorial();
        } else {
            showWarningToast(`Tutorial não disponível para a página: ${pageNames[currentPageName] || currentPageName}`);
        }
    };
    
    // Adiciona botão de teste de seletores (apenas para debug)
    const testBtn = document.createElement('button');
    testBtn.innerHTML = '🧪 Test';
    testBtn.className = 'btn btn-secondary';
    testBtn.style.cssText = `
        position: fixed;
        bottom: 92px;
        right: 32px;
        z-index: 100002;
        background: #6b7280;
        color: white;
        border: none;
        border-radius: 8px;
        padding: 8px 12px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(107, 114, 128, 0.3);
        transition: all 0.3s ease;
        font-size: 0.9rem;
    `;
    
    testBtn.onclick = function() {
        console.log('🧪 Iniciando teste completo de seletores...');
        testAllTutorialSelectors();
    };
    
    document.body.appendChild(testBtn);
    
    document.body.appendChild(btn);
    
    // Atualiza o texto do botão quando a página muda
    function updateTutorialButton() {
        const currentPageName = getCurrentPage();
        const pageNames = {
            'dashboard': 'Dashboard',
            'create': 'Criação em Massa',
            'create-single': 'Criação Individual'
        };
        
        const pageName = pageNames[currentPageName] || currentPageName;
        btn.innerHTML = `❓ Tutorial<br><small style="font-size: 0.8em; opacity: 0.9;">${pageName}</small>`;
        
        // Muda a cor do botão se não houver tutorial disponível
        if (tutorialSteps[currentPageName]) {
            btn.style.background = '#3b82f6';
            btn.style.cursor = 'pointer';
            btn.disabled = false;
        } else {
            btn.style.background = '#6b7280';
            btn.style.cursor = 'not-allowed';
            btn.disabled = true;
        }
    }
    
    // Observer para detectar mudança de página
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                const target = mutation.target;
                if (target.classList.contains('page-section') && target.classList.contains('active')) {
                    setTimeout(updateTutorialButton, 100);
                }
            }
        });
    });
    
    // Observa mudanças nas páginas
    document.querySelectorAll('.page-section').forEach(page => {
        observer.observe(page, { attributes: true, attributeFilter: ['class'] });
    });
    
    // Atualização inicial
    setTimeout(updateTutorialButton, 500);
});

function showVsCodeConfig(ip, nome, event) {
    // Para a propagação do evento para evitar seleção do container
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    
    // Cria o conteúdo do modal
    const configText = `Host ${nome}\n    HostName ${ip}\n    User root\n    UserKnownHostsFile /dev/null\n    StrictHostKeyChecking no`;
    // Cria o modal se não existir
    let modal = document.getElementById('vscodeConfigModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'vscodeConfigModal';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100vw';
        modal.style.height = '100vh';
        modal.style.background = 'rgba(30,41,59,0.6)';
        modal.style.zIndex = '100003';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.innerHTML = `
            <div style="background:white; color:#1e293b; border-radius:12px; box-shadow:0 8px 32px rgba(0,0,0,0.2); padding:2rem; min-width:320px; max-width:90vw; text-align:left; position:relative;">
                <h2 style="margin-bottom:1rem; font-size:1.2rem;">Configuração SSH para VS Code</h2>
                <pre style="background:#f1f5f9; color:#1e293b; border-radius:8px; padding:1rem; font-size:1rem; margin-bottom:1.5rem;">${configText}</pre>
                <button id="closeVsCodeConfigModal" style="position:absolute; top:12px; right:12px; background:none; border:none; font-size:1.5rem; color:#64748b; cursor:pointer;">&times;</button>
                <button id="copyVsCodeConfig" style="background:#3b82f6; color:white; border:none; border-radius:8px; padding:0.5rem 1.2rem; font-weight:600; cursor:pointer;">Copiar</button>
            </div>
        `;
        document.body.appendChild(modal);
    } else {
        modal.querySelector('pre').textContent = configText;
        modal.style.display = 'flex';
    }
    // Fechar modal
    document.getElementById('closeVsCodeConfigModal').onclick = function() {
        modal.style.display = 'none';
    };
    // Copiar para área de transferência
    document.getElementById('copyVsCodeConfig').onclick = function() {
        navigator.clipboard.writeText(configText);
        showSuccessToast('Configuração copiada!');
    };
}
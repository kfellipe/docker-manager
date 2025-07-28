// Page Navigation
function showPage(pageId) {
    console.log('🔄 showPage chamada com pageId:', pageId);
    
    // Hide all pages
    document.querySelectorAll('.page-section').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show selected page
    const targetPage = document.getElementById(`${pageId}-page`);
    if (targetPage) {
        targetPage.classList.add('active');
        console.log('✅ Página ativada:', `${pageId}-page`);
    } else {
        console.error('❌ Página não encontrada:', `${pageId}-page`);
    }
    
    // Update navigation links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    const targetLink = document.getElementById(`${pageId}-link`);
    if (targetLink) {
        targetLink.classList.add('active');
        console.log('✅ Link ativado:', `${pageId}-link`);
    } else {
        console.error('❌ Link não encontrado:', `${pageId}-link`);
    }
    
    console.log('✅ showPage concluída para:', pageId);
}

// Theme Toggle Functionality
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const themeText = document.getElementById('themeText');
const body = document.body;

// Check for saved theme preference or default to light mode
const currentTheme = localStorage.getItem('theme') || 'light';
body.setAttribute('data-theme', currentTheme);
updateThemeButton(currentTheme);

themeToggle.addEventListener('click', () => {
    const currentTheme = body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeButton(newTheme);
});

function updateThemeButton(theme) {
    if (theme === 'dark') {
        themeIcon.textContent = '☀️';
        themeText.textContent = 'Tema Claro';
    } else {
        themeIcon.textContent = '🌙';
        themeText.textContent = 'Tema Escuro';
    }
}
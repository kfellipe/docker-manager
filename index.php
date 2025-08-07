<?php
// Configurações do banco de dados
$servername = "127.0.0.1";
$username = "admin"; // Altere conforme necessário
$password = "senaiead"; // Altere conforme necessário
$database = "test"; // Altere para o nome do seu banco

?>
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Teste de Conexão com Banco de Dados</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .success {
            color: #28a745;
            background-color: #d4edda;
            padding: 15px;
            border: 1px solid #c3e6cb;
            border-radius: 5px;
            margin: 20px 0;
        }
        .error {
            color: #dc3545;
            background-color: #f8d7da;
            padding: 15px;
            border: 1px solid #f5c6cb;
            border-radius: 5px;
            margin: 20px 0;
        }
        .info {
            color: #0c5460;
            background-color: #d1ecf1;
            padding: 15px;
            border: 1px solid #bee5eb;
            border-radius: 5px;
            margin: 20px 0;
        }
        h1 {
            color: #333;
            text-align: center;
        }
        .details {
            margin-top: 20px;
            padding: 15px;
            background-color: #f8f9fa;
            border-radius: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔌 Teste de Conexão com Banco de Dados</h1>
        
        <?php
        // Função para criar banco de dados se não existir
        function criarBancoDados($servername, $username, $password, $database) {
            $resultados = [];
            
            // Tentar com MySQLi
            $conn = new mysqli($servername, $username, $password);
            if (!$conn->connect_error) {
                // Verificar se o banco existe
                $result = $conn->query("SHOW DATABASES LIKE '$database'");
                if ($result->num_rows == 0) {
                    // Banco não existe, tentar criar
                    if ($conn->query("CREATE DATABASE IF NOT EXISTS `$database` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")) {
                        $resultados[] = [
                            'tipo' => 'MySQLi',
                            'acao' => 'criar',
                            'sucesso' => true,
                            'mensagem' => "Banco de dados '$database' criado com sucesso!"
                        ];
                    } else {
                        $resultados[] = [
                            'tipo' => 'MySQLi',
                            'acao' => 'criar',
                            'sucesso' => false,
                            'mensagem' => "Erro ao criar banco: " . $conn->error
                        ];
                    }
                } else {
                    $resultados[] = [
                        'tipo' => 'MySQLi',
                        'acao' => 'verificar',
                        'sucesso' => true,
                        'mensagem' => "Banco de dados '$database' já existe!"
                    ];
                }
                $conn->close();
            } else {
                $resultados[] = [
                    'tipo' => 'MySQLi',
                    'acao' => 'conectar',
                    'sucesso' => false,
                    'mensagem' => "Erro de conexão MySQLi: " . $conn->connect_error
                ];
            }
            
            // Tentar com PDO como backup
            try {
                $pdo = new PDO("mysql:host=$servername", $username, $password);
                $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                
                // Verificar se o banco existe
                $stmt = $pdo->prepare("SHOW DATABASES LIKE ?");
                $stmt->execute([$database]);
                
                if ($stmt->rowCount() == 0) {
                    // Banco não existe, tentar criar
                    $pdo->exec("CREATE DATABASE IF NOT EXISTS `$database` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
                    $resultados[] = [
                        'tipo' => 'PDO',
                        'acao' => 'criar',
                        'sucesso' => true,
                        'mensagem' => "Banco de dados '$database' criado com sucesso via PDO!"
                    ];
                } else {
                    $resultados[] = [
                        'tipo' => 'PDO',
                        'acao' => 'verificar',
                        'sucesso' => true,
                        'mensagem' => "Banco de dados '$database' já existe (verificado via PDO)!"
                    ];
                }
            } catch(PDOException $e) {
                $resultados[] = [
                    'tipo' => 'PDO',
                    'acao' => 'erro',
                    'sucesso' => false,
                    'mensagem' => "Erro PDO: " . $e->getMessage()
                ];
            }
            
            return $resultados;
        }
        
        // Função para testar conexão usando MySQLi
        function testarConexaoMySQLi($servername, $username, $password, $database) {
            $conn = new mysqli($servername, $username, $password, $database);
            
            if ($conn->connect_error) {
                return [
                    'sucesso' => false,
                    'erro' => $conn->connect_error,
                    'tipo' => 'MySQLi'
                ];
            }
            
            $versao = $conn->server_info;
            $conn->close();
            
            return [
                'sucesso' => true,
                'versao' => $versao,
                'tipo' => 'MySQLi'
            ];
        }
        
        // Função para testar conexão usando PDO
        function testarConexaoPDO($servername, $username, $password, $database) {
            try {
                $dsn = "mysql:host=$servername;dbname=$database;charset=utf8mb4";
                $pdo = new PDO($dsn, $username, $password);
                $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                
                $stmt = $pdo->query('SELECT VERSION()');
                $versao = $stmt->fetchColumn();
                
                return [
                    'sucesso' => true,
                    'versao' => $versao,
                    'tipo' => 'PDO'
                ];
            } catch(PDOException $e) {
                return [
                    'sucesso' => false,
                    'erro' => $e->getMessage(),
                    'tipo' => 'PDO'
                ];
            }
        }
        
        // Primeiro, tentar criar o banco de dados se não existir
        $resultadoCriacao = criarBancoDados($servername, $username, $password, $database);
        
        // Testar as duas formas de conexão
        $resultadoMySQLi = testarConexaoMySQLi($servername, $username, $password, $database);
        $resultadoPDO = testarConexaoPDO($servername, $username, $password, $database);
        ?>
        
        <div class="info">
            <strong>Configurações testadas:</strong><br>
            Servidor: <?php echo htmlspecialchars($servername); ?><br>
            Usuário: <?php echo htmlspecialchars($username); ?><br>
            Banco de dados: <?php echo htmlspecialchars($database); ?>
        </div>
        
        <h3>🏗️ Criação/Verificação do Banco de Dados:</h3>
        
        <?php foreach ($resultadoCriacao as $resultado): ?>
            <?php if ($resultado['sucesso']): ?>
                <div class="success">
                    ✅ <strong><?php echo htmlspecialchars($resultado['tipo']); ?>:</strong> 
                    <?php echo htmlspecialchars($resultado['mensagem']); ?>
                </div>
            <?php else: ?>
                <div class="error">
                    ❌ <strong><?php echo htmlspecialchars($resultado['tipo']); ?>:</strong> 
                    <?php echo htmlspecialchars($resultado['mensagem']); ?>
                </div>
            <?php endif; ?>
        <?php endforeach; ?>
        
        <h3>📊 Resultado dos Testes de Conexão:</h3>
        
        <!-- Teste MySQLi -->
        <h4>Teste com MySQLi:</h4>
        <?php if ($resultadoMySQLi['sucesso']): ?>
            <div class="success">
                ✅ <strong>Conexão MySQLi bem-sucedida!</strong><br>
                Versão do MySQL: <?php echo htmlspecialchars($resultadoMySQLi['versao']); ?>
            </div>
        <?php else: ?>
            <div class="error">
                ❌ <strong>Erro na conexão MySQLi:</strong><br>
                <?php echo htmlspecialchars($resultadoMySQLi['erro']); ?>
            </div>
        <?php endif; ?>
        
        <!-- Teste PDO -->
        <h4>Teste com PDO:</h4>
        <?php if ($resultadoPDO['sucesso']): ?>
            <div class="success">
                ✅ <strong>Conexão PDO bem-sucedida!</strong><br>
                Versão do MySQL: <?php echo htmlspecialchars($resultadoPDO['versao']); ?>
            </div>
        <?php else: ?>
            <div class="error">
                ❌ <strong>Erro na conexão PDO:</strong><br>
                <?php echo htmlspecialchars($resultadoPDO['erro']); ?>
            </div>
        <?php endif; ?>
        
        <!-- Status geral -->
        <?php 
        $conexaoOK = $resultadoMySQLi['sucesso'] || $resultadoPDO['sucesso'];
        ?>
        
        <div class="details">
            <h4>📋 Resumo:</h4>
            <?php if ($conexaoOK): ?>
                <div class="success">
                    🎉 <strong>Pelo menos uma forma de conexão está funcionando!</strong>
                </div>
                <p>Sua aplicação PHP pode se conectar ao banco de dados MySQL no localhost.</p>
            <?php else: ?>
                <div class="error">
                    ⚠️ <strong>Nenhuma conexão foi bem-sucedida.</strong>
                </div>
                <p><strong>Possíveis soluções:</strong></p>
                <ul>
                    <li>Verifique se o MySQL está rodando</li>
                    <li>Confirme o usuário e senha</li>
                    <li>Verifique se o banco de dados existe</li>
                    <li>Confirme as permissões do usuário</li>
                </ul>
            <?php endif; ?>
        </div>
        
        <?php
        // Função para listar bancos de dados disponíveis
        function listarBancosDados($servername, $username, $password) {
            $bancos = [];
            
            // Tentar com MySQLi
            $conn = new mysqli($servername, $username, $password);
            if (!$conn->connect_error) {
                $result = $conn->query("SHOW DATABASES");
                if ($result) {
                    while ($row = $result->fetch_array()) {
                        $bancos[] = $row[0];
                    }
                }
                $conn->close();
            }
            
            return $bancos;
        }
        
        $bancosDisponiveis = listarBancosDados($servername, $username, $password);
        ?>
        
        <?php if (!empty($bancosDisponiveis)): ?>
        <div class="details">
            <h4>💾 Bancos de dados disponíveis no servidor:</h4>
            <ul>
            <?php foreach ($bancosDisponiveis as $banco): ?>
                <li><?php echo htmlspecialchars($banco); ?>
                    <?php if ($banco === $database): ?>
                        <strong style="color: #28a745;"> ← Banco sendo testado</strong>
                    <?php endif; ?>
                </li>
            <?php endforeach; ?>
            </ul>
        </div>
        <?php endif; ?>
        
        <div class="info">
            <strong>💡 Informações técnicas:</strong><br>
            PHP versão: <?php echo phpversion(); ?><br>
            Data/hora do teste: <?php echo date('d/m/Y H:i:s'); ?><br>
            Extensões disponíveis: 
            <?php
            $extensoes = [];
            if (extension_loaded('mysqli')) $extensoes[] = 'MySQLi';
            if (extension_loaded('pdo_mysql')) $extensoes[] = 'PDO MySQL';
            echo !empty($extensoes) ? implode(', ', $extensoes) : 'Nenhuma extensão MySQL detectada';
            ?>
            <br>
            Total de bancos encontrados: <?php echo count($bancosDisponiveis); ?>
        </div>
    </div>
</body>
</html>

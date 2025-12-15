-- =====================================================
-- Script de Criação do Banco de Dados GabiCam
-- =====================================================
-- Este script cria a estrutura completa do banco de dados
-- para o aplicativo GabiCam
-- =====================================================

-- Criar o banco de dados
CREATE DATABASE IF NOT EXISTS gabicam_db 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE gabicam_db;

-- =====================================================
-- Tabela: usuarios
-- Armazena os dados dos usuários do sistema
-- =====================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  matricula VARCHAR(20) NOT NULL UNIQUE,
  senha VARCHAR(255) NOT NULL,
  nome VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_matricula (matricula)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Tabela: provas
-- Armazena as provas criadas pelos usuários
-- =====================================================
CREATE TABLE IF NOT EXISTS provas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  nome VARCHAR(100) NOT NULL,
  data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  gabarito JSON DEFAULT NULL,
  nota_por_questao DECIMAL(5,2) DEFAULT 1.00,
  media_geral FLOAT DEFAULT 0,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_usuario_id (usuario_id),
  INDEX idx_data_criacao (data_criacao)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Tabela: imagens_provas
-- Armazena os resultados das correções das provas
-- =====================================================
CREATE TABLE IF NOT EXISTS imagens_provas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  prova_id INT NOT NULL,
  usuario_id INT NOT NULL,
  nome_aluno VARCHAR(255) NOT NULL,
  data_criacao TIMEST100) NOT NULL,
  data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('pendente', 'em_analise', 'corrigido') DEFAULT 'pendente',
  acertos INT DEFAULT 0,
  total_questoes INT DEFAULT 0,
  nota DECIMAL(4,2) DEFAULT 0.00,
  respostas_detectadas TEXT DEFAULT NULL,
  gabarito_usado TEXTid) REFERENCES provas(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_prova_id (prova_id),
  INDEX idx_usuario_id (usuario_id),
  INDEX idx_data_criacao (data_criacao),
  INDEX idx_nome_aluno (nome_aluno)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Dados de Exemplo (Opcional - Descomente para usar)
-- =====================================================
-- Inserir um usuário de teste (senha: 123456)
-- A senha está criptografada com bcrypt (10 rounds)
-- INSERT INTO usuarios (matricula, nome, senha) VALUES 
-- ('12345', 'Usuário Teste', '$2b$10$eKw7YZ5nH9pYvJ.N5n2YDuK1qC3h0vYhQxqX7vZpqX1ZzYvJXnZpq');

-- =====================================================
-- Informações sobre as Tabelas
-- =====================================================
-- 
-- USUARIOS:
--   - Armazena dados de login (matrícula, nome e senha criptografada)
--   - A senha é criptografada usando bcrypt com 10 rounds
--
--   - created_at: Data de criação do usuário
--   - updated_at: Data da última atualização (atualiza automaticamente)
--
-- PROVAS:
--   - Armazena informações das provas criadas
--   - gabarito: JSON com as respostas corretas (ex: ["A","B","C","D"])
--   - nota_por_questao: Valor de cada questão (padrão: 1.00)
--   - media_geral: Média calculada de todas as correções (FLOAT, padrão: 0)
--
-- IMAGENS_PROVAS:
--   - Armazena os resultados das correções
--   - status: ENUM com 3 valores possíveis: 'pendente', 'em_analise', 'corrigido'
--   - respostas_detectadas: TEXT (JSON serializado) com as respostas do aluno
--   - gabarito_usado: TEXT (JSON serializado) com o gabarito usado na correção
--   - nota: DECIMAL(4,2) -
-- =====================================================
-- Consultas Úteis
-- =====================================================

-- Ver todos os usuários:
-- SELECT id, matricula, nome, data_criacao FROM usuarios;

-- Ver todas as provas de um usuário:
-- SELECT * FROM provas WHERE usuario_id = 1;

-- Ver resultados de uma prova:
-- SELECT * FROM imagens_provas WHERE prova_id = 1 ORDER BY data_criacao DESC;

-- Estatísticas de uma prova:
-- SELECT 
--   p.nome as prova,
--   COUNT(ip.id) as total_alunos,
--   AVG(ip.nota) as media_turma,
--   MAX(ip.nota) as maior_nota,
--   MIN(ip.nota) as menor_nota
-- FROM provas p
-- LEFT JOIN imagens_provas ip ON p.id = ip.prova_id
-- WHERE p.id = 1
-- GROUP BY p.id;

-- =====================================================
-- Fim do Script
-- =====================================================

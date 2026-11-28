-- Estrutura do Banco de Dados: Hostel

CREATE DATABASE hostel;
USE hostel;

-- 1. Tabela de Usuários (Acesso ao Sistema)
CREATE TABLE usuario (
    id_usuario   INT         AUTO_INCREMENT PRIMARY KEY,
    nome         VARCHAR(80) NOT NULL,
    login        VARCHAR(30) NOT NULL UNIQUE,
    senha        VARCHAR(50) NOT NULL,
    nivel_acesso VARCHAR(20) DEFAULT 'recepcao'
);

-- 2. Tabela de Categorias de Quartos
CREATE TABLE categoria_quarto (
    codigo_categoria INT          PRIMARY KEY,
    nome_categoria   VARCHAR(50)  NOT NULL,
    valor_hora       DECIMAL(5,2) NOT NULL
);

-- 3. Tabela de Quartos
CREATE TABLE quarto (
    numero_quarto    INT         PRIMARY KEY,
    codigo_categoria INT,
    status_quarto    VARCHAR(20) DEFAULT 'Livre',
    ativo            TINYINT(1)  DEFAULT 1,
    FOREIGN KEY (codigo_categoria) REFERENCES categoria_quarto(codigo_categoria)
);

-- 4. Tabela de Clientes
CREATE TABLE cliente (
    id_cliente      INT         AUTO_INCREMENT PRIMARY KEY,
    nome            VARCHAR(80) NOT NULL,
    cpf             VARCHAR(14) NOT NULL,
    telefone        VARCHAR(15) NOT NULL,
    data_nascimento DATE        NOT NULL
);

-- 5. Tabela de Locações
CREATE TABLE locacao (
    id_locacao               INT          AUTO_INCREMENT PRIMARY KEY,
    id_cliente               INT,
    numero_quarto            INT,
    data_hora_entrada        DATETIME     NOT NULL,
    data_hora_saida_estimada DATETIME     NULL,
    data_hora_saida          DATETIME     NULL,
    tempo_estimado_horas     INT          NOT NULL,
    valor_total              DECIMAL(6,2) NULL,
    status_caixa             VARCHAR(15)  DEFAULT 'Aberto',
    placa_veiculo            VARCHAR(10)  NULL,
    FOREIGN KEY (id_cliente)    REFERENCES cliente(id_cliente),
    FOREIGN KEY (numero_quarto) REFERENCES quarto(numero_quarto)
);
-- =========================================================
-- ÍNDICES (OTIMIZAÇÃO DE CONSULTAS)
-- =========================================================

-- UNIQUE porque o check-in reaproveita o cliente pelo CPF
CREATE UNIQUE INDEX idx_cliente_cpf
ON cliente (cpf);

CREATE INDEX idx_quarto_status_ativo
ON quarto (ativo, status_quarto);

CREATE INDEX idx_locacao_status_saida
ON locacao (status_caixa, data_hora_saida);

CREATE INDEX idx_locacao_entrada
ON locacao (data_hora_entrada);

-- View 1: Quartos ativos com sua categoria e valor por hora
CREATE OR REPLACE VIEW vw_quartos_ativos AS
SELECT
    q.numero_quarto,
    q.status_quarto,
    q.codigo_categoria,
    cq.nome_categoria,
    cq.valor_hora
FROM quarto q
INNER JOIN categoria_quarto cq ON q.codigo_categoria = cq.codigo_categoria
WHERE q.ativo = 1;

-- View 2: Quartos desativados (Soft Delete)
CREATE OR REPLACE VIEW vw_quartos_inativos AS
SELECT
    q.numero_quarto,
    cq.nome_categoria
FROM quarto q
INNER JOIN categoria_quarto cq ON q.codigo_categoria = cq.codigo_categoria
WHERE q.ativo = 0;

-- View 3: Locações completas (encapsula locacao + cliente + quarto + categoria_quarto)
CREATE OR REPLACE VIEW vw_locacoes_detalhadas AS
SELECT
    l.id_locacao,
    l.id_cliente,
    c.nome,
    c.cpf,
    l.numero_quarto,
    cq.nome_categoria,
    cq.valor_hora,
    l.data_hora_entrada,
    l.data_hora_saida_estimada,
    l.data_hora_saida,
    l.valor_total,
    l.status_caixa,
    l.placa_veiculo
FROM locacao l
INNER JOIN cliente c           ON l.id_cliente = c.id_cliente
INNER JOIN quarto q            ON l.numero_quarto = q.numero_quarto
INNER JOIN categoria_quarto cq ON q.codigo_categoria = cq.codigo_categoria;
-- View 4: Faturamento mensal das locações com caixa fechado
CREATE OR REPLACE VIEW vw_faturamento_mensal AS
SELECT
    YEAR(data_hora_saida)                AS ano,
    MONTH(data_hora_saida)               AS mes,
    DATE_FORMAT(data_hora_saida, '%m/%Y') AS mes_ano,
    COUNT(id_locacao)                    AS qtd_locacoes,
    SUM(valor_total)                     AS total_mes
FROM locacao
WHERE status_caixa = 'Fechado' AND data_hora_saida IS NOT NULL
GROUP BY YEAR(data_hora_saida), MONTH(data_hora_saida), DATE_FORMAT(data_hora_saida, '%m/%Y');

-- =========================================================
-- TRIGGERS (AUTOMAÇÃO DO STATUS DOS QUARTOS)
-- =========================================================
DELIMITER $$

-- Impede check-in em quarto inexistente, desativado ou que não esteja Livre
CREATE TRIGGER trg_locacao_valida_checkin
BEFORE INSERT ON locacao
FOR EACH ROW
BEGIN
    DECLARE v_status VARCHAR(20);
    DECLARE v_ativo  TINYINT;

    SELECT status_quarto, ativo INTO v_status, v_ativo
    FROM quarto WHERE numero_quarto = NEW.numero_quarto;

    IF v_status IS NULL OR v_ativo = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Quarto inexistente ou desativado.';
    ELSEIF v_status <> 'Livre' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Quarto não está livre para check-in.';
    END IF;
END$$

-- Check-in gravado: o quarto passa a Ocupado
CREATE TRIGGER trg_locacao_checkin
AFTER INSERT ON locacao
FOR EACH ROW
BEGIN
    UPDATE quarto SET status_quarto = 'Ocupado'
    WHERE numero_quarto = NEW.numero_quarto;
END$$

-- Check-out gravado (saída passou de NULL para uma data): o quarto vai para a limpeza
CREATE TRIGGER trg_locacao_checkout
AFTER UPDATE ON locacao
FOR EACH ROW
BEGIN
    IF OLD.data_hora_saida IS NULL AND NEW.data_hora_saida IS NOT NULL THEN
        UPDATE quarto SET status_quarto = 'Em Limpeza'
        WHERE numero_quarto = NEW.numero_quarto;
    END IF;
END$$

-- Check-in cancelado (locação em aberto excluída): o quarto volta a ficar Livre
CREATE TRIGGER trg_locacao_cancelada
AFTER DELETE ON locacao
FOR EACH ROW
BEGIN
    IF OLD.data_hora_saida IS NULL THEN
        UPDATE quarto SET status_quarto = 'Livre'
        WHERE numero_quarto = OLD.numero_quarto;
    END IF;
END$$

-- =========================================================
-- STORED PROCEDURE (CHECK-OUT)
-- =========================================================
-- Calcula o valor (mínimo 1 hora, fração de hora cobrada inteira) e fecha a locação.
-- O UPDATE dispara trg_locacao_checkout, que manda o quarto para a limpeza.
CREATE PROCEDURE sp_fazer_checkout(IN p_id_locacao INT, IN p_saida DATETIME, OUT p_total DECIMAL(6,2))
BEGIN
    DECLARE v_entrada DATETIME;
    DECLARE v_valor_hora DECIMAL(5,2);

    SELECT l.data_hora_entrada, cq.valor_hora INTO v_entrada, v_valor_hora
    FROM locacao l
    INNER JOIN quarto q            ON l.numero_quarto = q.numero_quarto
    INNER JOIN categoria_quarto cq ON q.codigo_categoria = cq.codigo_categoria
    WHERE l.id_locacao = p_id_locacao AND l.data_hora_saida IS NULL;

    IF v_entrada IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Locação não encontrada ou já encerrada.';
    END IF;
    IF p_saida <= v_entrada THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'A saída deve ser posterior à entrada.';
    END IF;

    SET p_total = GREATEST(1, CEIL(TIMESTAMPDIFF(MINUTE, v_entrada, p_saida) / 60)) * v_valor_hora;

    UPDATE locacao
    SET data_hora_saida = p_saida,
        valor_total     = p_total
    WHERE id_locacao = p_id_locacao;
END$$

DELIMITER ;

-- =========================================================
-- Dados iniciais
-- =========================================================

INSERT INTO usuario (nome, login, senha, nivel_acesso) VALUES
('Anderson (Dono)', 'admin',    '1234', 'admin'),
('João (Recepção)', 'recepcao', '1234', 'recepcao');

INSERT INTO categoria_quarto (codigo_categoria, nome_categoria, valor_hora) VALUES
(1, 'Beliche Compartilhado', 30.00),
(2, 'Quarto Privativo',      45.00),
(3, 'Suíte Premium',         80.00);

INSERT INTO quarto (numero_quarto, codigo_categoria, status_quarto) VALUES
(101, 1, 'Livre'), (102, 1, 'Livre'), (103, 1, 'Livre'),
(201, 2, 'Livre'), (202, 2, 'Livre'), (203, 2, 'Livre'),
(301, 3, 'Livre'), (302, 3, 'Livre'), (303, 3, 'Livre');

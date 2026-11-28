-- Sentenças de demonstração do Seminário II (rodar depois de banco_de_dados.sql e carga/dados_simulados.sql)
USE hostel;

-- 1. Cadastro de cliente e check-in no quarto 201 (a trigger trg_locacao_checkin ocupa o quarto)
INSERT INTO cliente (nome, cpf, telefone, data_nascimento)
VALUES ('Sofia Andrade Lopes', '321.654.987-00', '(38) 99812-4455', '2001-03-14');

INSERT INTO locacao (id_cliente, numero_quarto, data_hora_entrada, data_hora_saida_estimada, tempo_estimado_horas, placa_veiculo)
VALUES (LAST_INSERT_ID(), 201, '2026-11-28 09:00', '2026-11-28 13:00', 4, NULL);

SELECT numero_quarto, status_quarto FROM quarto WHERE numero_quarto = 201;

-- 2. Check-in em quarto ocupado e em quarto desativado (barrados por trg_locacao_valida_checkin)
INSERT INTO locacao (id_cliente, numero_quarto, data_hora_entrada, tempo_estimado_horas)
VALUES (1, 201, '2026-11-28 09:30', 2);
INSERT INTO locacao (id_cliente, numero_quarto, data_hora_entrada, tempo_estimado_horas)
VALUES (1, 303, '2026-11-28 09:30', 2);

-- 3. Listagem com relacionamento: hóspedes no hostel agora (view com locacao, cliente, quarto e categoria)
SELECT id_locacao, nome, numero_quarto, nome_categoria, placa_veiculo
FROM vw_locacoes_detalhadas
WHERE data_hora_saida IS NULL
ORDER BY numero_quarto;

-- 4. Check-out pela procedure (2h20 de permanência, cobradas 3 horas de R$ 45,00)
CALL sp_fazer_checkout((SELECT id_locacao FROM locacao WHERE numero_quarto = 201 AND data_hora_saida IS NULL),
                       '2026-11-28 11:20', @total);
SELECT @total AS valor_cobrado;
SELECT numero_quarto, status_quarto FROM quarto WHERE numero_quarto = 201;

-- 5. Alteração: limpeza concluída e reajuste do valor da hora da Suíte Premium
UPDATE quarto SET status_quarto = 'Livre' WHERE numero_quarto = 201;
UPDATE categoria_quarto SET valor_hora = 85.00 WHERE codigo_categoria = 3;
SELECT * FROM categoria_quarto;

-- 6. Exclusão: check-in lançado por engano no quarto 203 (trg_locacao_cancelada libera o quarto)
INSERT INTO locacao (id_cliente, numero_quarto, data_hora_entrada, tempo_estimado_horas)
VALUES (5, 203, '2026-11-28 10:00', 2);
SELECT numero_quarto, status_quarto FROM quarto WHERE numero_quarto = 203;
DELETE FROM locacao WHERE numero_quarto = 203 AND data_hora_saida IS NULL;
SELECT numero_quarto, status_quarto FROM quarto WHERE numero_quarto = 203;

-- 7. Consultas gerenciais: faturamento por mês e clientes que mais se hospedaram
SELECT mes_ano, qtd_locacoes, total_mes FROM vw_faturamento_mensal ORDER BY ano, mes;

SELECT c.nome, COUNT(l.id_locacao) AS hospedagens, SUM(l.valor_total) AS total_gasto
FROM cliente c
INNER JOIN locacao l ON l.id_cliente = c.id_cliente
WHERE l.valor_total IS NOT NULL
GROUP BY c.id_cliente, c.nome
ORDER BY hospedagens DESC, total_gasto DESC
LIMIT 5;

-- 8. Plano de execução: busca de cliente pelo CPF e locações de um período usam os índices
EXPLAIN SELECT id_cliente FROM cliente WHERE cpf = '321.654.987-00';
EXPLAIN SELECT id_locacao, valor_total FROM locacao
WHERE data_hora_entrada BETWEEN '2026-11-01' AND '2026-11-07 23:59';

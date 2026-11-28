// ==========================================
// CARREGAMENTO DOS QUARTOS (GRID)
// ==========================================
// Cor e ação de cada status, usadas no cartão do quarto
const STATUS_QUARTO = {
    'Livre':      { cor: '#22c55e', fundo: '#dcfce7', texto: '#15803d', acao: 'Fazer check-in' },
    'Ocupado':    { cor: '#ef4444', fundo: '#fee2e2', texto: '#b91c1c', acao: 'Fazer check-out' },
    'Em Limpeza': { cor: '#f59e0b', fundo: '#fef3c7', texto: '#92400e', acao: 'Liberar quarto' }
};

// Essa função formata um valor em reais no padrão brasileiro
function emReais(valor) {
    return parseFloat(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Essa função busca os quartos ativos e monta a grade da recepção
function carregarQuartos() {
    fetch('../backend/api.php?acao=buscar_quartos')
    .then(r => r.json())
    .then(dados => {
        if (!dados.sucesso) return;
        const grid = document.getElementById('listaQuartos');
        grid.innerHTML = '';
        const contagem = { 'Livre': 0, 'Ocupado': 0, 'Em Limpeza': 0 };

        dados.quartos.forEach(q => {
            const st = STATUS_QUARTO[q.status_quarto] || STATUS_QUARTO['Em Limpeza'];
            if (q.status_quarto in contagem) contagem[q.status_quarto]++;

            const card = document.createElement('button');
            card.type = 'button';
            card.className = 'cartao-quarto group flex flex-col justify-start bg-white rounded-2xl text-left p-4 shadow-sm border border-stone-200/70 focus-visible:outline-violet-600';
            card.style.borderTop = `4px solid ${st.cor}`;
            card.setAttribute('aria-label', `Quarto ${q.numero_quarto}, ${q.status_quarto}. ${st.acao}`);
            card.innerHTML = `
                <div class="flex items-start justify-between gap-2">
                    <span class="num text-3xl font-extrabold text-stone-900 leading-none">${q.numero_quarto}</span>
                    <span class="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold" style="background:${st.fundo};color:${st.texto}">${q.status_quarto}</span>
                </div>
                <p class="mt-3 text-sm text-stone-600">${q.nome_categoria}</p>
                <p class="num text-sm font-semibold text-violet-700 mb-3">${emReais(q.valor_hora)} por hora</p>
                <p class="mt-auto pt-3 border-t border-stone-100 text-xs font-semibold text-stone-500 group-hover:text-violet-700 group-focus-visible:text-violet-700 transition-colors">${st.acao}</p>
            `;

            card.addEventListener('click', () => {
                if (q.status_quarto === 'Livre')        abrirModal(q.numero_quarto);
                else if (q.status_quarto === 'Ocupado') abrirModalCheckout(q.numero_quarto);
                else                                     perguntarLiberacaoLimpeza(q.numero_quarto);
            });

            grid.appendChild(card);
        });

        document.getElementById('contLivre').innerText    = contagem['Livre'];
        document.getElementById('contOcupado').innerText  = contagem['Ocupado'];
        document.getElementById('contLimpeza').innerText  = contagem['Em Limpeza'];
    })
    .catch(e => console.error('Erro ao buscar quartos:', e));
}

// Esc fecha o modal aberto
document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!document.getElementById('modalCheckin').classList.contains('hidden'))  fecharModal();
    if (!document.getElementById('modalCheckout').classList.contains('hidden')) fecharModalCheckout();
    if (!document.getElementById('modalLimpeza').classList.contains('hidden'))  fecharModalLimpeza();
});

carregarQuartos();

// ==========================================
// HELPERS DE DATA/HORA
// ==========================================
function agoraTexto() {
    const d = new Date();
    const p = n => String(n).padStart(2, '0');
    return `${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function textoParaISO(str) {
    // "DD/MM/AAAA HH:MM" → "YYYY-MM-DDTHH:MM"
    const [data, hora] = (str || '').split(' ');
    if (!data || !hora) return '';
    const [dia, mes, ano] = data.split('/');
    return `${ano}-${mes}-${dia}T${hora}`;
}

function isoParaTexto(str) {
    // "2025-06-21 14:30:00" → "21/06/2025 14:30"
    if (!str) return '';
    const [data, hora] = str.replace('T', ' ').split(' ');
    const [ano, mes, dia] = data.split('-');
    return `${dia}/${mes}/${ano} ${hora.slice(0, 5)}`;
}

function parseDataHoraTexto(str) {
    const iso = textoParaISO(str);
    return iso ? new Date(iso) : null;
}

// ==========================================
// MÁSCARAS DE ENTRADA
// ==========================================
function mascaraDataHora(e) {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 12) v = v.slice(0, 12);
    v = v.replace(/^(\d{2})(\d)/, '$1/$2');
    v = v.replace(/^(\d{2}\/\d{2})(\d)/, '$1/$2');
    v = v.replace(/^(\d{2}\/\d{2}\/\d{4})(\d)/, '$1 $2');
    v = v.replace(/^(\d{2}\/\d{2}\/\d{4} \d{2})(\d)/, '$1:$2');
    e.target.value = v;
}

document.getElementById('data_hora_entrada').addEventListener('input', mascaraDataHora);
document.getElementById('data_hora_saida_estimada').addEventListener('input', mascaraDataHora);
document.getElementById('data_hora_saida_input').addEventListener('input', function(e) {
    mascaraDataHora(e);
    atualizarTotalCheckout();
});

document.getElementById('data_nascimento').addEventListener('input', function(e) {
    let v = e.target.value.replace(/\D/g, '');
    v = v.replace(/(\d{2})(\d)/, '$1/$2');
    v = v.replace(/(\d{2})(\d)/, '$1/$2');
    e.target.value = v;
});

document.getElementById('cpf').addEventListener('input', function(e) {
    let v = e.target.value.replace(/\D/g, '');
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    e.target.value = v;
});

document.getElementById('telefone').addEventListener('input', function(e) {
    let v = e.target.value.replace(/\D/g, '');
    v = v.replace(/^(\d{2})(\d)/g, '($1) $2');
    v = v.replace(/(\d{5})(\d)/, '$1-$2');
    e.target.value = v;
});

// ==========================================
// MODAL: CHECK-IN
// ==========================================
function abrirModal(numeroQuarto) {
    document.getElementById('modalCheckin').classList.remove('hidden');
    document.getElementById('tituloModal').innerText = `Check-in no quarto ${numeroQuarto}`;
    setTimeout(() => document.getElementById('nome').focus(), 0);
    document.getElementById('quarto_selecionado').value = numeroQuarto;
    document.getElementById('mensagemModal').classList.add('hidden');

    document.getElementById('data_hora_entrada').value = agoraTexto();
}

function fecharModal() {
    document.getElementById('modalCheckin').classList.add('hidden');
    document.getElementById('formCheckin').reset();
    document.getElementById('mensagemModal').classList.add('hidden');
    document.getElementById('data_hora_saida_estimada').value = '';
}

document.getElementById('formCheckin').addEventListener('submit', function(e) {
    e.preventDefault();

    const dataDigitada = document.getElementById('data_nascimento').value;
    const partes = dataDigitada.split('/');
    let dataParaBanco = '';
    if (partes.length === 3) dataParaBanco = `${partes[2]}-${partes[1]}-${partes[0]}`;

    const dados = {
        quarto:           document.getElementById('quarto_selecionado').value,
        nome:             document.getElementById('nome').value,
        cpf:              document.getElementById('cpf').value,
        telefone:         document.getElementById('telefone').value,
        data_nascimento:  dataParaBanco,
        placa_veiculo:    document.getElementById('placa_veiculo').value,
        data_hora_entrada:         textoParaISO(document.getElementById('data_hora_entrada').value),
        data_hora_saida_estimada:  textoParaISO(document.getElementById('data_hora_saida_estimada').value) || null
    };

    fetch('../backend/api.php?acao=fazer_checkin', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(dados)
    })
    .then(r => r.json())
    .then(resp => {
        const el = document.getElementById('mensagemModal');
        el.classList.remove('hidden');
        if (resp.sucesso) {
            el.style.color = '#16a34a';
            el.innerText = resp.mensagem;
            setTimeout(() => { fecharModal(); carregarQuartos(); }, 1400);
        } else {
            el.style.color = '#dc2626';
            el.innerText = resp.mensagem;
        }
    });
});

// ==========================================
// MODAL: CHECK-OUT
// ==========================================
function abrirModalCheckout(numeroQuarto) {
    document.getElementById('modalCheckout').classList.remove('hidden');
    document.getElementById('numQuartoCheckout').innerText = numeroQuarto;
    document.getElementById('quarto_checkout').value = numeroQuarto;
    document.getElementById('mensagemCheckout').classList.add('hidden');

    ['checkoutNome','checkoutEntrada','checkoutHoras','checkoutTotal']
        .forEach(id => document.getElementById(id).innerText = '...');

    document.getElementById('data_hora_saida_input').value = agoraTexto();

    fetch(`../backend/api.php?acao=obter_detalhes_checkout&quarto=${numeroQuarto}`)
    .then(r => r.json())
    .then(dados => {
        if (dados.sucesso) {
            document.getElementById('checkoutNome').innerText    = dados.nome;
            document.getElementById('checkoutEntrada').innerText = dados.entrada;
            document.getElementById('id_locacao_checkout').value = dados.id_locacao;
            document.getElementById('entrada_iso_checkout').value = dados.data_hora_entrada_iso;
            document.getElementById('valor_hora_checkout').value  = dados.valor_hora;

            const estimada = dados.saida_estimada_formatada;
            document.getElementById('checkoutSaidaEstimada').innerText = estimada || '—';
            document.getElementById('rowSaidaEstimada').style.display = estimada ? '' : 'none';

            if (dados.data_hora_saida_estimada) {
                document.getElementById('data_hora_saida_input').value =
                    isoParaTexto(dados.data_hora_saida_estimada);
            } else {
                document.getElementById('data_hora_saida_input').value = agoraTexto();
            }
            atualizarTotalCheckout();
        } else {
            const el = document.getElementById('mensagemCheckout');
            el.classList.remove('hidden');
            el.style.color = '#dc2626';
            el.innerText = dados.mensagem;
        }
    });
}

function atualizarTotalCheckout() {
    const entradaISO = document.getElementById('entrada_iso_checkout').value;
    const saidaVal   = document.getElementById('data_hora_saida_input').value;
    const valorHora  = parseFloat(document.getElementById('valor_hora_checkout').value || '0');

    if (!entradaISO || !saidaVal) return;

    const entrada = new Date(entradaISO.replace(' ', 'T'));
    const saida   = parseDataHoraTexto(saidaVal);
    const minutos = (saida - entrada) / (1000 * 60);

    if (minutos <= 0) {
        document.getElementById('checkoutHoras').innerText = '—';
        document.getElementById('checkoutTotal').innerText = '0,00';
        return;
    }

    const horas = Math.max(1, Math.ceil(minutos / 60));
    const total = (horas * valorHora).toFixed(2).replace('.', ',');
    document.getElementById('checkoutHoras').innerText = `${horas}h`;
    document.getElementById('checkoutTotal').innerText = total;
}

function fecharModalCheckout() {
    document.getElementById('modalCheckout').classList.add('hidden');
    document.getElementById('mensagemCheckout').classList.add('hidden');
}

function confirmarCheckout() {
    const saidaVal = document.getElementById('data_hora_saida_input').value;
    const saidaISO = textoParaISO(saidaVal);

    if (!saidaISO) {
        const el = document.getElementById('mensagemCheckout');
        el.classList.remove('hidden');
        el.style.color = '#dc2626';
        el.innerText = 'Informe a data e hora de saída no formato DD/MM/AAAA HH:MM.';
        return;
    }

    const dadosCheckout = {
        id_locacao:      document.getElementById('id_locacao_checkout').value,
        quarto:          document.getElementById('quarto_checkout').value,
        data_hora_saida: saidaISO
    };

    fetch('../backend/api.php?acao=fazer_checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(dadosCheckout)
    })
    .then(r => r.json())
    .then(dados => {
        const el = document.getElementById('mensagemCheckout');
        el.classList.remove('hidden');
        if (dados.sucesso) {
            el.style.color = '#16a34a';
            el.innerText = dados.mensagem;
            setTimeout(() => { fecharModalCheckout(); carregarQuartos(); }, 1400);
        } else {
            el.style.color = '#dc2626';
            el.innerText = dados.mensagem;
        }
    });
}

// Essa função cancela um check-in lançado por engano, excluindo a locação em aberto
function cancelarCheckin() {
    if (!confirm('Excluir esta locação e liberar o quarto?')) return;

    fetch('../backend/api.php?acao=cancelar_checkin', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id_locacao: document.getElementById('id_locacao_checkout').value })
    })
    .then(r => r.json())
    .then(dados => {
        const el = document.getElementById('mensagemCheckout');
        el.classList.remove('hidden');
        el.style.color = dados.sucesso ? '#16a34a' : '#dc2626';
        el.innerText = dados.mensagem;
        if (dados.sucesso) setTimeout(() => { fecharModalCheckout(); carregarQuartos(); }, 1400);
    });
}

// ==========================================
// MODAL: LIMPEZA
// ==========================================
function perguntarLiberacaoLimpeza(numeroQuarto) {
    document.getElementById('modalLimpeza').classList.remove('hidden');
    document.getElementById('numQuartoLimpeza').innerText = numeroQuarto;
    document.getElementById('quarto_limpeza_id').value = numeroQuarto;
}

function fecharModalLimpeza() {
    document.getElementById('modalLimpeza').classList.add('hidden');
    const msg = document.getElementById('mensagemLimpeza');
    msg.classList.add('hidden');
    msg.innerText = '';
}

function confirmarLimpeza() {
    const num = document.getElementById('quarto_limpeza_id').value;
    fetch('../backend/api.php?acao=finalizar_limpeza', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ quarto: num })
    })
    .then(r => r.json())
    .then(dados => {
        if (dados.sucesso) {
            fecharModalLimpeza();
            carregarQuartos();
        } else {
            const el = document.getElementById('mensagemLimpeza');
            el.classList.remove('hidden');
            el.style.color = '#dc2626';
            el.innerText = dados.mensagem;
        }
    });
}

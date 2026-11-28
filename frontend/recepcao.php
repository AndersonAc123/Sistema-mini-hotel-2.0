<?php
session_start();
if (!isset($_SESSION['id_usuario'])) { header("Location: login.html"); exit; }
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recepção — Hostel</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="estilo.css">
</head>
<body class="min-h-screen" style="background-color:#f5f3ff;">

    <!-- NAVBAR -->
    <header class="sticky top-0 z-10 shadow-lg" style="background-color:#1e1b4b;">
        <div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style="background-color:#7c3aed;">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-violet-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 21h19.5M3.75 3h16.5M4.5 3v18M19.5 3v18M9 7.5h1.5m4.5 0H16.5M9 12h1.5m4.5 0H16.5M9 16.5h1.5m4.5 0H16.5" />
                    </svg>
                </div>
                <div>
                    <h1 class="text-white font-bold text-base leading-tight">Hostel</h1>
                    <p class="text-violet-300 text-xs">Recepção</p>
                </div>
            </div>
            <div class="flex items-center gap-4">
                <span class="text-violet-200 text-sm hidden sm:inline">Olá, <strong><?= htmlspecialchars($_SESSION['nome']) ?></strong></span>
                <?php if ($_SESSION['nivel'] == 'admin'): ?>
                    <a href="painel.php"
                        class="text-sm font-medium px-3 py-1.5 rounded-lg transition text-white bg-violet-600 hover:bg-violet-700">
                        Painel gerencial
                    </a>
                <?php endif; ?>
                <a href="logout.php" class="text-violet-200 hover:text-white text-sm font-medium transition">Sair</a>
            </div>
        </div>
    </header>

    <!-- CONTEÚDO PRINCIPAL -->
    <main class="max-w-7xl mx-auto px-4 py-8">

        <!-- Legenda de status -->
        <div class="flex flex-wrap items-baseline gap-x-6 gap-y-2 mb-6">
            <h2 class="text-stone-800 font-bold text-xl mr-2">Quartos</h2>
            <div class="flex items-center gap-1.5 text-sm text-stone-600">
                <span class="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"></span> Livres <strong id="contLivre" class="num text-stone-800">0</strong>
            </div>
            <div class="flex items-center gap-1.5 text-sm text-stone-600">
                <span class="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span> Ocupados <strong id="contOcupado" class="num text-stone-800">0</strong>
            </div>
            <div class="flex items-center gap-1.5 text-sm text-stone-600">
                <span class="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span> Em limpeza <strong id="contLimpeza" class="num text-stone-800">0</strong>
            </div>
        </div>

        <!-- Grid de quartos (preenchido via JS) -->
        <div id="listaQuartos" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4" aria-live="polite"></div>
    </main>

    <!-- ================================================ -->
    <!-- MODAL: CHECK-IN                                  -->
    <!-- ================================================ -->
    <div id="modalCheckin" role="dialog" aria-modal="true" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4" style="background-color:rgba(0,0,0,0.65);">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-screen overflow-y-auto">
            <div class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-stone-100">
                <h2 id="tituloModal" class="text-lg font-bold text-stone-800">Check-in</h2>
                <button onclick="fecharModal()" aria-label="Fechar" class="p-1 -m-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12"/></svg>
                </button>
            </div>

            <form id="formCheckin" class="px-6 py-5 space-y-3">
                <input type="hidden" id="quarto_selecionado">

                <div>
                    <label for="nome" class="block text-xs font-semibold text-stone-600 uppercase tracking-wide mb-1">Nome Completo *</label>
                    <input type="text" id="nome" required
                        class="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-stone-800 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:bg-white transition text-sm">
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label for="cpf" class="block text-xs font-semibold text-stone-600 uppercase tracking-wide mb-1">CPF *</label>
                        <input type="text" id="cpf" placeholder="000.000.000-00" maxlength="14" required
                            class="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-stone-800 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:bg-white transition text-sm">
                    </div>
                    <div>
                        <label for="telefone" class="block text-xs font-semibold text-stone-600 uppercase tracking-wide mb-1">Telefone *</label>
                        <input type="text" id="telefone" placeholder="(00) 00000-0000" maxlength="15" required
                            class="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-stone-800 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:bg-white transition text-sm">
                    </div>
                </div>

                <div>
                    <label for="data_nascimento" class="block text-xs font-semibold text-stone-600 uppercase tracking-wide mb-1">Nascimento *</label>
                    <input type="text" id="data_nascimento" placeholder="DD/MM/AAAA" maxlength="10" required
                        class="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-stone-800 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:bg-white transition text-sm">
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label for="data_hora_entrada" class="block text-xs font-semibold text-stone-600 uppercase tracking-wide mb-1">Entrada *</label>
                        <input type="text" id="data_hora_entrada" placeholder="DD/MM/AAAA HH:MM" maxlength="16" required
                            class="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-stone-800 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:bg-white transition text-sm">
                    </div>
                    <div>
                        <label for="data_hora_saida_estimada" class="block text-xs font-semibold text-stone-600 uppercase tracking-wide mb-1">Saída Estimada</label>
                        <input type="text" id="data_hora_saida_estimada" placeholder="DD/MM/AAAA HH:MM" maxlength="16"
                            class="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-stone-800 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:bg-white transition text-sm">
                    </div>
                </div>

                <div>
                    <label for="placa_veiculo" class="block text-xs font-semibold text-stone-600 uppercase tracking-wide mb-1">Placa do Veículo (opcional)</label>
                    <input type="text" id="placa_veiculo" placeholder="ABC-1234"
                        class="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-stone-800 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:bg-white transition text-sm">
                </div>

                <button type="submit"
                    class="w-full text-white font-semibold py-3 rounded-xl transition mt-2 active:scale-[.98] bg-violet-600 hover:bg-violet-700">
                    Confirmar check-in
                </button>
                <div id="mensagemModal" class="text-center text-sm font-medium mt-1 hidden"></div>
            </form>
        </div>
    </div>

    <!-- ================================================ -->
    <!-- MODAL: CHECK-OUT                                 -->
    <!-- ================================================ -->
    <div id="modalCheckout" role="dialog" aria-modal="true" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4" style="background-color:rgba(0,0,0,0.65);">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-stone-100">
                <h2 class="text-lg font-bold text-stone-800">Check-out do quarto <span id="numQuartoCheckout" class="num"></span></h2>
                <button onclick="fecharModalCheckout()" aria-label="Fechar" class="p-1 -m-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12"/></svg>
                </button>
            </div>

            <div class="px-6 py-5">
                <div class="bg-violet-50 rounded-xl p-4 space-y-2.5 border border-violet-100 mb-4">
                    <div class="flex justify-between items-center text-sm">
                        <span class="text-stone-500">Hóspede</span>
                        <span class="font-semibold text-stone-800" id="checkoutNome">—</span>
                    </div>
                    <div class="flex justify-between items-center text-sm">
                        <span class="text-stone-500">Entrada</span>
                        <span class="font-medium text-stone-700" id="checkoutEntrada">—</span>
                    </div>
                    <div class="flex justify-between items-center text-sm" id="rowSaidaEstimada">
                        <span class="text-stone-500">Saída estimada</span>
                        <span class="font-medium text-stone-600" id="checkoutSaidaEstimada">—</span>
                    </div>
                    <div class="flex justify-between items-center text-sm">
                        <span class="text-stone-500">Horas cobradas</span>
                        <span class="font-medium text-stone-800 num" id="checkoutHoras">—</span>
                    </div>
                    <div class="border-t border-violet-200 pt-3 mt-1 flex justify-between items-center">
                        <span class="font-bold text-stone-700">Total a pagar</span>
                        <span class="text-2xl font-bold text-violet-900 num">R$ <span id="checkoutTotal">0,00</span></span>
                    </div>
                </div>

                <div class="mb-4">
                    <label for="data_hora_saida_input" class="block text-xs font-semibold text-stone-600 uppercase tracking-wide mb-1">Data/Hora de Saída *</label>
                    <input type="text" id="data_hora_saida_input" placeholder="DD/MM/AAAA HH:MM" maxlength="16"
                        class="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-stone-800 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:bg-white transition text-sm">
                </div>

                <input type="hidden" id="id_locacao_checkout">
                <input type="hidden" id="quarto_checkout">
                <input type="hidden" id="entrada_iso_checkout">
                <input type="hidden" id="valor_hora_checkout">

                <button onclick="confirmarCheckout()"
                    class="w-full text-white font-semibold py-3 rounded-xl transition active:scale-[.98] bg-violet-600 hover:bg-violet-700">
                    Finalizar e enviar para limpeza
                </button>
                <button onclick="cancelarCheckin()"
                    class="w-full mt-2 text-red-700 font-medium py-2.5 rounded-xl hover:bg-red-50 transition text-sm">
                    Cancelar check-in lançado por engano
                </button>
                <div id="mensagemCheckout" class="text-center text-sm font-medium mt-2 hidden"></div>
            </div>
        </div>
    </div>

    <!-- ================================================ -->
    <!-- MODAL: LIMPEZA                                   -->
    <!-- ================================================ -->
    <div id="modalLimpeza" role="dialog" aria-modal="true" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4" style="background-color:rgba(0,0,0,0.65);">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm text-center">
            <div class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-stone-100">
                <h2 class="text-lg font-bold text-stone-800">Quarto <span id="numQuartoLimpeza" class="num"></span> em limpeza</h2>
                <button onclick="fecharModalLimpeza()" aria-label="Fechar" class="p-1 -m-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12"/></svg>
                </button>
            </div>
            <div class="px-6 py-6">
                <div class="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <p class="text-stone-700 font-medium mb-1">A limpeza deste quarto foi concluída?</p>
                <p class="text-stone-500 text-sm mb-5">O quarto voltará a ficar disponível para locação.</p>

                <input type="hidden" id="quarto_limpeza_id">
                <div id="mensagemLimpeza" class="text-sm font-medium mb-3 hidden"></div>
                <button onclick="confirmarLimpeza()"
                    class="w-full text-white font-semibold py-3 rounded-xl transition active:scale-[.98] bg-violet-600 hover:bg-violet-700">
                    Liberar quarto
                </button>
            </div>
        </div>
    </div>

    <script src="app.js"></script>
</body>
</html>

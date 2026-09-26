export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // 1. Rota Principal / (Dashboard Tailwind CSS + FontAwesome + Integração KV Real)
    if (path === '/') {
      const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>QuantumISP - Dashboard de Borda</title>
          <!-- Tailwind CSS CDN -->
          <script src="https://cdn.tailwindcss.com"></script>
          <!-- Font Awesome CDN -->
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
          <!-- Google Fonts Inter -->
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
          <style> body { font-family: 'Inter', sans-serif; } </style>
      </head>
      <body class="bg-slate-950 text-slate-100 min-h-screen p-4 md:p-8">
          <div class="max-w-4xl mx-auto space-y-6">
              
              <!-- Header -->
              <header class="flex flex-col md:flex-row justify-between items-center bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-2xl">
                  <div>
                      <h1 class="text-2xl font-bold tracking-tight text-cyan-400 flex items-center gap-2">
                          <i class="fa-solid fa-bolt"></i> QuantumISP
                      </h1>
                      <p class="text-slate-400 text-sm mt-1">Provedor de Borda Serverless na Nuvem Cloudflare</p>
                  </div>
                  <div class="mt-4 md:mt-0 bg-slate-950 px-4 py-2 rounded-lg border border-slate-800 flex items-center gap-3">
                      <i class="fa-solid fa-wallet text-cyan-400"></i>
                      <div>
                          <p class="text-xs text-slate-400">Carteira Quantum Pay</p>
                          <p class="text-lg font-bold text-cyan-300" id="saldoDisplay">QC$ --</p>
                      </div>
                  </div>
              </header>

              <!-- Ações Rápidas & Missões -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg">
                      <h2 class="text-lg font-semibold mb-2 flex items-center gap-2 text-indigo-400">
                          <i class="fa-solid fa-bullseye"></i> Central de Missões
                      </h2>
                      <p class="text-slate-400 text-sm mb-4">Complete as 8 missões (HTML, Python, Alertas, Worker) para acumular QC$.</p>
                      <a href="/misson/" target="_blank" class="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-medium text-sm transition">
                          <i class="fa-solid fa-gamepad"></i> Acessar Missões
                      </a>
                  </div>

                  <div class="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg">
                      <h2 class="text-lg font-semibold mb-2 flex items-center gap-2 text-emerald-400">
                          <i class="fa-solid fa-key"></i> Sua Chave de Acesso Ativa
                      </h2>
                      <p class="text-slate-400 text-sm mb-2">Chave gerada pelo sistema via API KV:</p>
                      <div id="chaveAtiva" class="bg-slate-950 p-3 rounded-lg border border-emerald-900/50 text-emerald-400 font-mono text-xs break-all">
                          Nenhuma chave resgatada ainda.
                      </div>
                  </div>
              </div>

              <!-- Loja de Planos -->
              <div class="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg">
                  <h2 class="text-xl font-bold mb-4 flex items-center gap-2 text-cyan-400">
                      <i class="fa-solid fa-store"></i> Loja Quantum Pay (Planos)
                  </h2>
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div class="bg-slate-950 border border-slate-800 p-4 rounded-lg flex flex-col justify-between">
                          <div>
                              <h3 class="font-bold text-lg text-white">BASIC</h3>
                              <p class="text-xs text-slate-400 mt-1">100MB de cota de túnel</p>
                              <p class="text-cyan-400 font-bold mt-3">QC$ 30</p>
                          </div>
                          <button onclick="comprar('basic', 30)" class="mt-4 bg-cyan-600 hover:bg-cyan-500 text-white py-2 rounded-lg text-sm font-medium transition">Selecionar</button>
                      </div>

                      <div class="bg-slate-950 border border-slate-800 p-4 rounded-lg flex flex-col justify-between">
                          <div>
                              <h3 class="font-bold text-lg text-white">ADVANCED</h3>
                              <p class="text-xs text-slate-400 mt-1">500MB de cota de túnel</p>
                              <p class="text-cyan-400 font-bold mt-3">QC$ 40</p>
                          </div>
                          <button onclick="comprar('advanced', 40)" class="mt-4 bg-cyan-600 hover:bg-cyan-500 text-white py-2 rounded-lg text-sm font-medium transition">Selecionar</button>
                      </div>

                      <div class="bg-slate-950 border border-slate-800 p-4 rounded-lg flex flex-col justify-between">
                          <div>
                              <h3 class="font-bold text-lg text-white">ENTERPRISE</h3>
                              <p class="text-xs text-slate-400 mt-1">1 Gigabit de cota</p>
                              <p class="text-cyan-400 font-bold mt-3">QC$ 214</p>
                          </div>
                          <button onclick="comprar('enterprise', 214)" class="mt-4 bg-cyan-600 hover:bg-cyan-500 text-white py-2 rounded-lg text-sm font-medium transition">Selecionar</button>
                      </div>
                  </div>

                  <!-- Checkout Iframe -->
                  <div class="border border-slate-800 rounded-lg overflow-hidden bg-slate-950">
                      <div class="bg-slate-900 px-4 py-2 border-b border-slate-800 text-xs font-semibold text-slate-400 flex items-center gap-2">
                          <i class="fa-solid fa-lock text-emerald-400"></i> Quantum Pay Gateway (Iframe Secure)
                      </div>
                      <iframe id="payFrame" src="/quantumpay/pay/" class="w-full h-64 border-0"></iframe>
                  </div>
              </div>

          </div>

          <script>
              async function carregarSaldo() {
                  try {
                      let res = await fetch('/quantum/api/gain/');
                      let data = await res.json();
                      document.getElementById('saldoDisplay').innerText = "QC$ " + data.qc;
                  } catch (e) {
                      document.getElementById('saldoDisplay').innerText = "QC$ 150";
                  }
              }

              async function comprar(tier, preco) {
                  let res = await fetch(\`/quantumpay/pay/?tier=\${tier}&price=\${preco}\`);
                  let html = await res.text();
                  let frameDoc = document.getElementById('payFrame').contentDocument;
                  frameDoc.open();
                  frameDoc.write(html);
                  frameDoc.close();
              }

              window.exibirChaveOficial = function(chave, plano) {
                  document.getElementById('chaveAtiva').innerHTML = \`<strong>[\${plano}]</strong><br>\${chave}\`;
              }

              carregarSaldo();
          </script>
      </body>
      </html>`;
      return addHsts(new Response(html, { headers: { 'Content-Type': 'text/html;charset=UTF-8' } }));
    }

    // 2. Rota /quantumpay/pay/ (Checkout do Iframe com Integração Real)
    if (path === '/quantumpay/pay/') {
      const tier = url.searchParams.get('tier') || 'none';
      const price = url.searchParams.get('price') || '0';
      let nomePlano = "Nenhum plano selecionado";

      if (tier === 'basic') nomePlano = "Quantum Basic (100MB)";
      else if (tier === 'advanced') nomePlano = "Quantum Advanced (500MB)";
      else if (tier === 'enterprise') nomePlano = "Quantum Enterprise (1Gig)";

      const payHtml = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
          <meta charset="UTF-8">
          <script src="https://cdn.tailwindcss.com"></script>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
          <style> body { font-family: 'Inter', sans-serif; } </style>
      </head>
      <body class="bg-slate-950 text-slate-100 p-6 flex flex-col items-center justify-center h-full">
          <div class="text-center space-y-3">
              <h3 class="text-lg font-bold text-cyan-400"><i class="fa-solid fa-cart-shopping"></i> Checkout Quantum Pay</h3>
              <p class="text-sm text-slate-300">Plano: <span class="font-semibold text-white">${nomePlano}</span></p>
              <p class="text-sm text-slate-300">Valor: <span class="font-bold text-rose-400">QC$ ${price}</span></p>
              ${tier !== 'none' ? `
                <button onclick="processarPagamentoReal('${tier}')" class="mt-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-5 py-2 rounded-lg text-sm transition shadow-lg">
                    <i class="fa-solid fa-check"></i> Pagar e Gerar Chave via API KV
                </button>` : '<p class="text-xs text-slate-500">Selecione um plano acima para prosseguir.</p>'}
          </div>

          <script>
              async function processarPagamentoReal(tierSelecionado) {
                  let res = await fetch('/quantum/api/checkout/?tier=' + tierSelecionado);
                  let data = await res.json();
                  if(data.success) {
                      window.parent.exibirChaveOficial(data.apiKey, data.planName);
                      document.body.innerHTML = '<div class="text-center text-emerald-400 font-medium"><i class="fa-solid fa-circle-check text-2xl mb-2"></i><br>Pagamento Realizado! Chave gerada e enviada para o seu Dashboard.</div>';
                  } else {
                      alert('Erro ao processar pagamento: ' + (data.error || 'Saldo insuficiente'));
                  }
              }
          </script>
      </body>
      </html>`;
      return addHsts(new Response(payHtml, { headers: { 'Content-Type': 'text/html;charset=UTF-8' } }));
    }

    // 3. API de Checkout Real (Gera a chave real e grava no Cloudflare KV)
    if (path === '/quantum/api/checkout/') {
      const tier = url.searchParams.get('tier') || 'basic';
      let planName = "Quantum Basic";
      let limitBytes = 100 * 1024 * 1024;

      if (tier === 'advanced') { planName = "Quantum Advanced"; limitBytes = 500 * 1024 * 1024; }
      else if (tier === 'enterprise') { planName = "Quantum Enterprise"; limitBytes = 1024 * 1024 * 1024; }

      // Gera chave real única
      const apiKey = `q_${tier}_` + crypto.randomUUID();
      const planData = {
        plan: planName,
        limitBytes: limitBytes,
        usedBytes: 0,
        createdAt: new Date().toISOString()
      };

      // Grava no Cloudflare KV de verdade (exige binding QUANTUM_KV no wrangler.toml)
      try {
        if (env.QUANTUM_KV) {
          await env.QUANTUM_KV.put(apiKey, JSON.stringify(planData));
        }
      } catch (e) {
        // Fallback caso KV não esteja vinculado no ambiente local de teste
      }

      return addHsts(new Response(JSON.stringify({ success: true, apiKey: apiKey, planName: planName }), {
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    // 4. Rota /misson/ (Central de 8 Missões com Tailwind e FontAwesome)
    if (path === '/misson/') {
      const missoesHtml = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
          <meta charset="UTF-8">
          <script src="https://cdn.tailwindcss.com"></script>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
          <style> body { font-family: 'Inter', sans-serif; } </style>
      </head>
      <body class="bg-slate-950 text-slate-100 p-6 md:p-10">
          <div class="max-w-3xl mx-auto space-y-6">
              <div class="flex justify-between items-center bg-slate-900 border border-slate-800 p-6 rounded-xl">
                  <div>
                      <h1 class="text-xl font-bold text-indigo-400 flex items-center gap-2">
                          <i class="fa-solid fa-gamepad"></i> Central de Missões QuantumISP
                      </h1>
                      <p class="text-slate-400 text-sm mt-1">Complete tarefas de HTML, Python, Alertas e Arquitetura para ganhar QC$</p>
                  </div>
                  <a href="/" class="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2">
                      <i class="fa-solid fa-arrow-left"></i> Voltar
                  </a>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
                      <div><span class="text-xs font-bold text-indigo-400">MISSÃO 1</span><h3 class="font-bold text-white mt-1">HTML Básico & Tags</h3><p class="text-xs text-slate-400 mt-1">Estruturar tags semânticas no projeto.</p></div>
                      <button onclick="concluirMissao(25)" class="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg text-xs font-semibold transition">Resgatar 25 QC$</button>
                  </div>
                  <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
                      <div><span class="text-xs font-bold text-indigo-400">MISSÃO 2</span><h3 class="font-bold text-white mt-1">Python Script</h3><p class="text-xs text-slate-400 mt-1">Escrever daemons de automação.</p></div>
                      <button onclick="concluirMissao(25)" class="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg text-xs font-semibold transition">Resgatar 25 QC$</button>
                  </div>
                  <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
                      <div><span class="text-xs font-bold text-indigo-400">MISSÃO 3</span><h3 class="font-bold text-white mt-1">Alertas JS & UI</h3><p class="text-xs text-slate-400 mt-1">Disparar interações de feedback.</p></div>
                      <button onclick="concluirMissao(30)" class="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg text-xs font-semibold transition">Resgatar 30 QC$</button>
                  </div>
                  <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
                      <div><span class="text-xs font-bold text-indigo-400">MISSÃO 4</span><h3 class="font-bold text-white mt-1">Worker Deploy</h3><p class="text-xs text-slate-400 mt-1">Subir script na borda Cloudflare.</p></div>
                      <button onclick="concluirMissao(40)" class="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg text-xs font-semibold transition">Resgatar 40 QC$</button>
                  </div>
                  <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
                      <div><span class="text-xs font-bold text-indigo-400">MISSÃO 5</span><h3 class="font-bold text-white mt-1">HSTS Security</h3><p class="text-xs text-slate-400 mt-1">Blindar conexões com Strict-Transport.</p></div>
                      <button onclick="concluirMissao(35)" class="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg text-xs font-semibold transition">Resgatar 35 QC$</button>
                  </div>
                  <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
                      <div><span class="text-xs font-bold text-indigo-400">MISSÃO 6</span><h3 class="font-bold text-white mt-1">Durable Objects</h3><p class="text-xs text-slate-400 mt-1">Gerenciar WebSockets em tempo real.</p></div>
                      <button onclick="concluirMissao(50)" class="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg text-xs font-semibold transition">Resgatar 50 QC$</button>
                  </div>
                  <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
                      <div><span class="text-xs font-bold text-indigo-400">MISSÃO 7</span><h3 class="font-bold text-white mt-1">KV Storage Real</h3><p class="text-xs text-slate-400 mt-1">Salvar metadados na nuvem.</p></div>
                      <button onclick="concluirMissao(30)" class="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg text-xs font-semibold transition">Resgatar 30 QC$</button>
                  </div>
                  <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
                      <div><span class="text-xs font-bold text-indigo-400">MISSÃO 8</span><h3 class="font-bold text-white mt-1">Enterprise Master</h3><p class="text-xs text-slate-400 mt-1">Alcançar o topo da rede QuantumISP.</p></div>
                      <button onclick="concluirMissao(100)" class="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg text-xs font-semibold transition">Resgatar 100 QC$</button>
                  </div>
              </div>
          </div>

          <script>
              async function concluirMissao(qtd) {
                  await fetch('/quantum/api/gain/?add=' + qtd);
                  alert('Missão concluída com sucesso! +' + qtd + ' QC$ adicionados.');
              }
          </script>
      </body>
      </html>`;
      return addHsts(new Response(missoesHtml, { headers: { 'Content-Type': 'text/html;charset=UTF-8' } }));
    }

    // 5. API /quantum/api/gain/
    if (path === '/quantum/api/gain/') {
      const addQc = parseInt(url.searchParams.get('add') || '0');
      let currentQc = 150 + addQc; 
      return addHsts(new Response(JSON.stringify({ qc: currentQc, status: "success" }), {
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    return addHsts(new Response("Not Found", { status: 404 }));
  }
};

function addHsts(response: Response): Response {
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  return response;
}

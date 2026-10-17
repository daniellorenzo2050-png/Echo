// ============================================================================
// CASTLY - CLOUDFLARE WORKER BACKEND (EDGE COMPUTING)
// Embutido com index.html completo, X-Frame-Options: DENY e PythonSL Account
// ============================================================================

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Cabeçalhos de segurança globais e CORS (com X-Frame-Options DENY)
    const securityHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-PythonSL-Account",
      "X-Frame-Options": "DENY",
      "X-Content-Type-Options": "nosniff",
    };

    if (method === "OPTIONS") {
      return new Response(null, { headers: securityHeaders });
    }

    try {
      // ------------------------------------------------------------------------
      // 1. ROTA PRINCIPAL: / (HTML Embutido + PythonSL Account)
      // ------------------------------------------------------------------------
      if (path === "/") {
        return handleCastlyPortal(request, env, securityHeaders);
      }

      // ------------------------------------------------------------------------
      // 2. API DE AUTENTICAÇÃO: PythonSL Account
      // ------------------------------------------------------------------------
      if (path === "/api/auth/register" && method === "POST") {
        return handleRegister(request, env, securityHeaders);
      }
      if (path === "/api/auth/login" && method === "POST") {
        return handleLogin(request, env, securityHeaders);
      }

      // ------------------------------------------------------------------------
      // 3. API DE VÍDEOS E STREAMING
      // ------------------------------------------------------------------------
      if (path === "/api/videos" && method === "GET") {
        return handleGetVideos(env, securityHeaders);
      }
      if (path === "/api/videos/upload" && method === "POST") {
        return handleUploadVideo(request, env, securityHeaders);
      }

      // ------------------------------------------------------------------------
      // 4. API DE MODERAÇÃO E BANIMENTOS
      // ------------------------------------------------------------------------
      if (path === "/api/moderate/ban" && method === "POST") {
        return handleBanUser(request, env, securityHeaders);
      }

      // ------------------------------------------------------------------------
      // 5. API DE DIREITOS AUTORAIS (DMCA & Copyright Claims)
      // ------------------------------------------------------------------------
      if (path === "/api/dmca/claim" && method === "POST") {
        return handleDMCAClaim(request, env, securityHeaders);
      }

      return new Response(JSON.stringify({ error: "Endpoint não encontrado no Castly" }), {
        status: 404,
        headers: { ...securityHeaders, "Content-Type": "application/json" }
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...securityHeaders, "Content-Type": "application/json" }
      });
    }
  }
};

// ============================================================================
// HTML EMBUTIDO DA INTERFACE (CASTLY PORTAL)
// ============================================================================
async function handleCastlyPortal(request, env, headers) {
  await initializeDatabase(env);

  const html = `<!DOCTYPE html>
<html lang="pt" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Castly - Powered by PythonSL</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    colors: {
                        pythonsl: { 500: '#3b82f6', 600: '#2563eb', dark: '#0f172a' }
                    }
                }
            }
        }
    </script>
</head>
<body class="bg-slate-900 text-slate-100 min-h-screen flex flex-col font-sans transition-colors duration-300">
    <!-- Navbar -->
    <header class="bg-slate-800 border-b border-slate-700 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div class="flex items-center space-x-3">
            <i class="fa-solid fa-bolt text-pythonsl-500 text-2xl"></i>
            <span class="text-xl font-bold tracking-wider">Castly <span class="text-xs bg-blue-600 px-2 py-0.5 rounded text-white">PythonSL</span></span>
        </div>
        <div class="flex items-center space-x-4">
            <button onclick="toggleDarkMode()" class="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition"><i class="fa-solid fa-moon text-yellow-400" id="theme-icon"></i></button>
            <div id="auth-container" class="flex items-center space-x-2">
                <span id="user-display" class="text-sm font-medium text-slate-300"></span>
                <button onclick="openAuthModal()" class="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm font-semibold transition shadow-lg">Entrar / PythonSL Account</button>
            </div>
        </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div class="lg:col-span-3 space-y-6">
            <!-- Video Player Preview Container -->
            <div class="bg-slate-800 rounded-2xl overflow-hidden shadow-2xl border border-slate-700">
                <div class="relative aspect-video bg-black flex items-center justify-center group">
                    <i class="fa-solid fa-play text-6xl text-white opacity-80 group-hover:scale-110 transition cursor-pointer"></i>
                    <div class="absolute bottom-4 left-4 right-4 flex justify-between items-center text-white bg-gradient-to-t from-black/80 p-4">
                        <div>
                            <h2 class="font-bold text-lg">PythonSL Expedition: São Paulo to Santos Roadtrip</h2>
                            <p class="text-xs text-slate-300">PythonSL Team • 7.500°C Core Output</p>
                        </div>
                        <button class="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-sm backdrop-blur transition"><i class="fa-solid fa-expand"></i></button>
                    </div>
                </div>
            </div>

            <!-- Feed de Vídeos -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4" id="video-feed">
                <!-- Conteúdo dinâmico -->
            </div>
        </div>

        <!-- Sidebar / DMCA & Painel -->
        <div class="space-y-6">
            <div class="bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-xl">
                <h3 class="font-bold text-lg mb-3 flex items-center gap-2"><i class="fa-solid fa-shield-halved text-blue-500"></i> Segurança & Moderação</h3>
                <p class="text-xs text-slate-400 mb-4">Plataforma protegida com restrições automáticas e X-Frame-Options DENY ativado.</p>
                <button onclick="openDmcaModal()" class="w-full bg-slate-700 hover:bg-slate-600 py-2 rounded-lg text-sm font-medium transition">Reivindicação DMCA</button>
            </div>
        </div>
    </main>

    <!-- Modal de Autenticação PythonSL Account -->
    <div id="auth-modal" class="fixed inset-0 bg-black/70 hidden flex items-center justify-center z-50 p-4">
        <div class="bg-slate-800 border border-slate-700 w-full max-w-md rounded-2xl p-6 shadow-2xl relative">
            <button onclick="closeAuthModal()" class="absolute top-4 right-4 text-slate-400 hover:text-white"><i class="fa-solid fa-xmark text-lg"></i></button>
            <h2 class="text-xl font-bold mb-4 flex items-center gap-2"><i class="fa-solid fa-id-card text-blue-500"></i> PythonSL Account</h2>
            <form id="auth-form" onsubmit="handleAuthSubmit(event)" class="space-y-4">
                <div>
                    <label class="block text-xs font-semibold text-slate-400 mb-1">Email (@pythonsl.com)</label>
                    <input type="email" id="auth-email" required class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" placeholder="nome@pythonsl.com">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-400 mb-1">Handle (@channel)</label>
                    <input type="text" id="auth-handle" required class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" placeholder="@seuchannel">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-400 mb-1">Senha (SHA-256)</label>
                    <input type="password" id="auth-password" required class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" placeholder="••••••••">
                </div>
                <button type="submit" class="w-full bg-blue-600 hover:bg-blue-500 py-2.5 rounded-lg font-semibold text-sm transition">Entrar / Cadastrar</button>
            </form>
        </div>
    </div>

    <script>
        function toggleDarkMode() { document.documentElement.classList.toggle('dark'); }
        function openAuthModal() { document.getElementById('auth-modal').classList.remove('hidden'); }
        function closeAuthModal() { document.getElementById('auth-modal').classList.add('hidden'); }

        async function handleAuthSubmit(e) {
            e.preventDefault();
            const email = document.getElementById('auth-email').value;
            const handle = document.getElementById('auth-handle').value;
            const password = document.getElementById('auth-password').value;

            const msgBuffer = new TextEncoder().encode(password);
            const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, handle, passwordHash })
            });
            const data = await res.json();
            if(res.ok) {
                alert('Autenticado com sucesso na PythonSL Account!');
                localStorage.setItem('pythonsl_session', JSON.stringify(data));
                closeAuthModal();
                location.reload();
            } else {
                alert('Erro: ' + data.error);
            }
        }
    </script>
</body>
</html>`;

  return new Response(html, {
    headers: { ...headers, "Content-Type": "text/html;charset=UTF-8" }
  });
}

// ============================================================================
// HANDLERS DE API
// ============================================================================
async function handleRegister(request, env, headers) {
  const { email, handle, passwordHash, avatarBase64 } = await request.json();
  if (!email || !email.endsWith("@pythonsl.com")) {
    return new Response(JSON.stringify({ error: "O email deve pertencer ao domínio @pythonsl.com" }), {
      status: 400, headers: { ...headers, "Content-Type": "application/json" }
    });
  }
  try {
    await env.DB.prepare(
      "INSERT INTO accounts (email, handle, password_hash, avatar_base64) VALUES (?, ?, ?, ?)"
    ).bind(email, handle, passwordHash, avatarBase64 || "").run();
    return new Response(JSON.stringify({ success: true, message: "Conta criada com sucesso" }), {
      headers: { ...headers, "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Erro ao criar conta: " + e.message }), {
      status: 400, headers: { ...headers, "Content-Type": "application/json" }
    });
  }
}

async function handleLogin(request, env, headers) {
  const { email, passwordHash } = await request.json();
  const account = await env.DB.prepare(
    "SELECT * FROM accounts WHERE email = ? AND password_hash = ?"
  ).bind(email, passwordHash).first();

  if (!account) {
    return new Response(JSON.stringify({ error: "Credenciais inválidas ou conta não encontrada." }), {
      status: 401, headers: { ...headers, "Content-Type": "application/json" }
    });
  }
  if (account.is_banned === 1) {
    return new Response(JSON.stringify({ error: "Conta banida por infração de segurança." }), {
      status: 403, headers: { ...headers, "Content-Type": "application/json" }
    });
  }
  return new Response(JSON.stringify({ success: true, email: account.email, handle: account.handle }), {
    headers: { ...headers, "Content-Type": "application/json" }
  });
}

async function handleGetVideos(env, headers) {
  const { results } = await env.DB.prepare("SELECT * FROM videos ORDER BY created_at DESC").all();
  return new Response(JSON.stringify(results || []), {
    headers: { ...headers, "Content-Type": "application/json" }
  });
}

async function handleUploadVideo(request, env, headers) {
  const { title, description, videoUrl, authorHandle } = await request.json();
  await env.DB.prepare(
    "INSERT INTO videos (title, description, video_url, author_handle) VALUES (?, ?, ?, ?)"
  ).bind(title, description, videoUrl, authorHandle).run();
  return new Response(JSON.stringify({ success: true, message: "Vídeo publicado" }), {
    headers: { ...headers, "Content-Type": "application/json" }
  });
}

async function handleBanUser(request, env, headers) {
  const { handle, reason } = await request.json();
  await env.DB.prepare("UPDATE accounts SET is_banned = 1 WHERE handle = ?").bind(handle).run();
  return new Response(JSON.stringify({ success: true, message: `Utilizador ${handle} banido.` }), {
    headers: { ...headers, "Content-Type": "application/json" }
  });
}

async function handleDMCAClaim(request, env, headers) {
  const { videoId, claimantEmail, justification } = await request.json();
  await env.DB.prepare(
    "INSERT INTO dmca_claims (video_id, claimant_email, justification) VALUES (?, ?, ?)"
  ).bind(videoId, claimantEmail, justification).run();
  await env.DB.prepare("DELETE FROM videos WHERE id = ?").bind(videoId).run();
  return new Response(JSON.stringify({ success: true, message: "Reclamação DMCA processada." }), {
    headers: { ...headers, "Content-Type": "application/json" }
  });
}

async function initializeDatabase(env) {
  try {
    await env.DB.exec(`
      CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        handle TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        avatar_base64 TEXT,
        is_banned INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS videos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        video_url TEXT NOT NULL,
        author_handle TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS dmca_claims (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        video_id INTEGER,
        claimant_email TEXT NOT NULL,
        justification TEXT NOT NULL,
        status TEXT DEFAULT 'PENDING',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (e) {}
}

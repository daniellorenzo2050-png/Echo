export interface Env {
  ORANGE_SITES: KVNamespace;
  ORANGE_DB: D1Database;
}

// Helper para gerar hash SHA-256 em ambiente Edge
async function hashPassword(password: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // --- 1. Rota Principal /: Painel de Criação de Sites com SweetAlert2 ---
    if (path === "/" || path === "") {
      const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
          <meta charset="UTF-8">
          <title>Orange Cloud - Hospedagem de Sites</title>
          <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
          <style>
              body { font-family: Arial, sans-serif; background: #fff5eb; color: #333; text-align: center; padding-top: 50px; }
              .btn-orange { background: #ff6600; color: white; border: none; padding: 12px 24px; font-size: 16px; border-radius: 8px; cursor: pointer; }
              .btn-orange:hover { background: #e05500; }
          </style>
      </head>
      <body>
          <h1>🍊 Bem-vindo à Orange Cloud</h1>
          <p>Plataforma de hospedagem serverless de alta performance.</p>
          <br>
          <button class="btn-orange" onclick="abrirPainel()">Criar / Gerenciar Site</button>

          <script>
              async function abrirPainel() {
                  const { value: formValues } = await Swal.fire({
                      title: 'Orange Cloud - Autenticação & Deploy',
                      html:
                          '<input id="swal-user" class="swal2-input" placeholder="Username">' +
                          '<input id="swal-pass" type="password" class="swal2-input" placeholder="Senha">' +
                          '<input id="swal-sitename" class="swal2-input" placeholder="Nome do Site (ex: meutelefone)">' +
                          '<textarea id="swal-code" class="swal2-textarea" placeholder="Código HTML do site"></textarea>',
                      focusConfirm: false,
                      showCancelButton: true,
                      confirmButtonText: 'Criar Site',
                      cancelButtonText: 'Signup / Cadastrar',
                      confirmButtonColor: '#ff6600',
                      preConfirm: () => {
                          return {
                              username: document.getElementById('swal-user').value,
                              password: document.getElementById('swal-pass').value,
                              siteName: document.getElementById('swal-sitename').value,
                              htmlCode: document.getElementById('swal-code').value,
                              action: 'deploy'
                          }
                      }
                  });

                  if (formValues) {
                      const res = await fetch('/api/deploy', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(formValues)
                      });
                      const data = await res.json();
                      if(res.ok) {
                          Swal.fire('Sucesso!', data.message + '<br><a href="' + data.url + '" target="_blank">Acessar Site</a>', 'success');
                      } else {
                          Swal.fire('Erro', data.error, 'error');
                      }
                  }
              }
          </script>
      </body>
      </html>`;
      return new Response(html, { headers: { "Content-Type": "text/html;charset=UTF-8" } });
    }

    // --- 2. API de Deploy e Cadastro (/api/deploy) ---
    if (path === "/api/deploy" && request.method === "POST") {
      try {
        const { username, password, siteName, htmlCode } = await request.json() as any;
        if (!username || !password || !siteName || !htmlCode) {
          return Response.json({ error: "Preencha todos os campos." }, { status: 400 });
        }

        const passHash = await hashPassword(password);

        // Verifica ou cadastra usuário no D1
        const userCheck = await env.ORANGE_DB.prepare("SELECT * FROM users WHERE username = ?").bind(username).first();
        if (!userCheck) {
          await env.ORANGE_DB.prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)").bind(username, passHash).run();
        } else if (userCheck.password_hash !== passHash) {
          return Response.json({ error: "Senha incorreta para este usuário." }, { status: 401 });
        }

        // Salva o conteúdo HTML do site no KV com metadados de cabeçalhos por rota
        await env.ORANGE_SITES.put(`site:${siteName}`, htmlCode, {
          metadata: { owner: username, createdAt: new Date().toISOString() }
        });

        const siteUrl = `/pages/${siteName}`;
        return Response.json({ 
          success: true, 
          message: `Site hospedado com sucesso na Orange Cloud!`,
          url: siteUrl 
        });
      } catch (err: any) {
        return Response.json({ error: err.message }, { status: 500 });
      }
    }

    // --- 3. Servidor de Páginas HTML Hospedadas (/pages/:name) ---
    if (path.startsWith("/pages/")) {
      const siteName = path.replace("/pages/", "");
      const siteData = await env.ORANGE_SITES.getWithMetadata(`site:${siteName}`);

      if (!siteData.value) {
        return new Response("404 - Site não encontrado na Orange Cloud", { status: 404 });
      }

      // Headers customizados exigidos para cada rota servida
      const customHeaders = {
        "Content-Type": "text/html;charset=UTF-8",
        "X-Powered-By": "Orange Cloud Engine",
        "X-Orange-Server": "Cloudflare Edge",
        "Cache-Control": "public, max-age=60"
      };

      return new Response(siteData.value, { headers: customHeaders });
    }

    return new Response("Endpoint não encontrado na Orange Cloud", { status: 404 });
  },
};

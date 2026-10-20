// Project Dragon — o mínimo de JS: vídeo, galeria (lightbox), formulário de pedido de acesso e métricas.

// ===== OS TRÊS PONTOS DE CONFIGURAÇÃO =====
// 1. Vídeo: o código do vídeo no YouTube (o que vem depois de "watch?v=" ou de "youtu.be/").
//    Vazio → a página mostra a capa com "Gameplay video coming soon".
var VIDEO_YOUTUBE = 'dNGbQo7ODF0';   // 20/10: o trailer, não listado

// 2. Pedidos de acesso. Ver PUBLICAR.md.
//    destino vazio → nada é enviado; quem preenche vê "Requests are not open yet." (aviso honesto).
//    Google Forms → destino = 'https://docs.google.com/forms/d/e/<código>/formResponse' e, em campos,
//      o "entry.N" de cada pergunta: { email: 'entry.1', account: 'entry.2', why: 'entry.3', ack: 'entry.4' }.
//    Outro serviço (ex.: Formspree) → só o destino; os campos vão com os nomes do formulário.
// 20/10: o Google Form "Project Dragon — Access Requests", na conta Google dele.
var PEDIDOS = {
  destino: 'https://docs.google.com/forms/d/e/1FAIpQLSeLF9sMJI7dXDRtoUT1sXMiBFJZqnzOt8G7lqzbppJyP9mwEA/formResponse',
  campos: { email: 'entry.1444206360', account: 'entry.378624587', why: 'entry.2121006602', ack: 'entry.151127294' }
};

// 3. Métricas de página: Vercel Web Analytics (visitas, origem, país). Só carrega no site publicado
//    (https); aberto por dois cliques ou em servidor local, nada é carregado.
//    20/10: a página foi pro GitHub Pages (playprojectdragon.github.io), onde isso não existe; fica desligado.
var METRICAS_VERCEL = false;

(function () {
  'use strict';

  // ---------- Idioma (20/10/2026: "ingles pra todos com opção de ptbr", "mas default english") ----------
  // Inglês por padrão; ?lang=pt|en no endereço vence a escolha guardada. O português mora no próprio HTML:
  // data-pt (conteúdo), data-pt-aria (aria-label) e data-pt-cap (legenda da foto ampliada).
  var CHAVE_IDIOMA = 'pd:idioma';
  var idioma = 'en';
  try { idioma = localStorage.getItem(CHAVE_IDIOMA) === 'pt' ? 'pt' : 'en'; } catch (e) { /* sem armazenamento */ }
  var pedido = new URLSearchParams(location.search).get('lang');
  if (pedido === 'pt' || pedido === 'en') idioma = pedido;
  function t(en, pt) { return idioma === 'pt' ? pt : en; }

  // Guarda o inglês original na primeira troca e escreve a língua pedida.
  function trocar(seletor, atributoPt, atributoEn, ler, escrever) {
    document.querySelectorAll(seletor).forEach(function (el) {
      if (!el.hasAttribute(atributoEn)) el.setAttribute(atributoEn, ler(el));
      escrever(el, el.getAttribute(idioma === 'pt' ? atributoPt : atributoEn));
    });
  }
  function aplicarIdioma(novo) {
    idioma = novo;
    document.documentElement.lang = novo === 'pt' ? 'pt-BR' : 'en';
    document.title = t('Project Dragon — Closed Alpha', 'Project Dragon — Alfa Fechado');
    trocar('[data-pt]', 'data-pt', 'data-en', function (el) { return el.innerHTML; }, function (el, v) { el.innerHTML = v; });
    trocar('[data-pt-aria]', 'data-pt-aria', 'data-en-aria', function (el) { return el.getAttribute('aria-label') || ''; }, function (el, v) { el.setAttribute('aria-label', v); });
    trocar('[data-pt-cap]', 'data-pt-cap', 'data-en-cap', function (el) { return el.getAttribute('data-caption') || ''; }, function (el, v) { el.setAttribute('data-caption', v); });
    document.querySelectorAll('.lang-btn').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === novo)); });
  }
  document.querySelectorAll('.lang-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      var novo = b.getAttribute('data-lang');
      if (novo === idioma) return;
      try { localStorage.setItem(CHAVE_IDIOMA, novo); } catch (e) { /* sem armazenamento */ }
      var u = new URL(location.href);
      if (u.searchParams.has('lang')) { u.searchParams.set('lang', novo); history.replaceState(null, '', u.toString()); }
      aplicarIdioma(novo);
    });
  });
  if (idioma !== 'en') aplicarIdioma(idioma);

  // ---------- Métricas ----------
  if (METRICAS_VERCEL && location.protocol === 'https:') {
    window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
    var va = document.createElement('script');
    va.defer = true;
    va.src = '/_vercel/insights/script.js';
    document.head.appendChild(va);
  }

  // ---------- Vídeo (capa clicável; o YouTube só carrega depois do clique) ----------
  var quadro = document.getElementById('video-frame');
  var play = document.getElementById('video-play');
  var embreve = document.getElementById('video-soon');
  if (VIDEO_YOUTUBE) {
    embreve.hidden = true;
    play.hidden = false;
    play.addEventListener('click', function () {
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(VIDEO_YOUTUBE) + '?autoplay=1&rel=0';
      f.title = 'Project Dragon — gameplay';
      f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      f.allowFullscreen = true;
      quadro.innerHTML = '';
      quadro.appendChild(f);
      f.focus();
    });
  }

  // ---------- Lightbox ----------
  var box = document.getElementById('lightbox');
  var img = document.getElementById('lb-img');
  var cap = document.getElementById('lb-cap');
  var btnPrev = document.getElementById('lb-prev');
  var btnNext = document.getElementById('lb-next');
  var btnClose = document.getElementById('lb-close');

  // A ordem de navegação segue a filmstrip; as miniaturas das notícias abrem a mesma foto.
  var strip = Array.prototype.slice.call(document.querySelectorAll('.filmstrip [data-lightbox]'));
  var fotos = strip.map(function (a) {
    return { id: a.getAttribute('data-lightbox'), src: a.getAttribute('href'), alt: a.querySelector('img').alt };
  });
  var atual = 0;
  var voltarFoco = null;

  function mostrar(i) {
    if (atual < 0) return;
    atual = (i + fotos.length) % fotos.length;
    var f = fotos[atual];
    img.src = f.src;
    img.alt = f.alt;
    // A legenda é lida na hora: muda junto com o idioma.
    cap.textContent = strip[atual].getAttribute('data-caption') || '';
  }

  function abrir(id, origem) {
    var i = -1;
    for (var k = 0; k < fotos.length; k++) { if (fotos[k].id === id) { i = k; break; } }
    voltarFoco = origem || null;
    atual = i;
    btnPrev.hidden = btnNext.hidden = i < 0;
    if (i < 0) {
      // Notícias fora da galeria abrem a própria foto, sem entrar na sequência.
      img.src = origem.getAttribute('href');
      img.alt = origem.querySelector('img').alt;
      var noticia = origem.closest('.news-item');
      var titulo = noticia && noticia.querySelector('.news-title');
      cap.textContent = origem.getAttribute('data-caption') || (titulo ? titulo.textContent : img.alt);
    } else {
      mostrar(i);
    }
    box.hidden = false;
    document.body.style.overflow = 'hidden';
    btnClose.focus();
  }

  function fechar() {
    box.hidden = true;
    img.removeAttribute('src');
    document.body.style.overflow = '';
    if (voltarFoco) voltarFoco.focus();
  }

  document.querySelectorAll('[data-lightbox]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      abrir(a.getAttribute('data-lightbox'), a);
    });
  });

  btnPrev.addEventListener('click', function () { mostrar(atual - 1); });
  btnNext.addEventListener('click', function () { mostrar(atual + 1); });
  btnClose.addEventListener('click', fechar);
  box.addEventListener('click', function (e) { if (e.target === box) fechar(); });
  document.addEventListener('keydown', function (e) {
    if (box.hidden) return;
    if (e.key === 'Escape') fechar();
    else if (e.key === 'ArrowLeft') mostrar(atual - 1);
    else if (e.key === 'ArrowRight') mostrar(atual + 1);
  });

  // ---------- Setas da filmstrip ----------
  var tira = document.getElementById('filmstrip');
  var setas = document.querySelectorAll('[data-strip]');
  function atualizarSetas() {
    var max = tira.scrollWidth - tira.clientWidth - 2;
    setas.forEach(function (b) {
      b.disabled = b.getAttribute('data-strip') === '-1' ? tira.scrollLeft <= 2 : tira.scrollLeft >= max;
    });
  }
  setas.forEach(function (b) {
    b.addEventListener('click', function () {
      var passo = tira.querySelector('.frame').getBoundingClientRect().width + 14;
      tira.scrollBy({ left: Number(b.getAttribute('data-strip')) * passo, behavior: 'smooth' });
    });
  });
  tira.addEventListener('scroll', atualizarSetas, { passive: true });
  window.addEventListener('resize', atualizarSetas);
  atualizarSetas();

  // ---------- Pedido de acesso ----------
  var form = document.getElementById('signup');
  var erro = document.getElementById('su-error');
  var feito = document.getElementById('su-done');
  var fechado = document.getElementById('su-closed');
  var botao = form.querySelector('button[type="submit"]');
  var enviando = false;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var campos = [form.email, form.account, form.why, form.ack];
    var primeiro = null;
    campos.forEach(function (c) {
      var ok = c.type === 'checkbox' ? c.checked : (c.value.trim() !== '' && c.checkValidity());
      c.setAttribute('aria-invalid', ok ? 'false' : 'true');
      if (!ok && !primeiro) primeiro = c;
    });
    if (primeiro) {
      erro.textContent = mensagem(primeiro);
      erro.hidden = false;
      primeiro.focus();
      return;
    }
    erro.hidden = true;
    if (!PEDIDOS.destino) {
      // Sem destino configurado: nada sai do navegador, e a página diz isso.
      form.hidden = true;
      fechado.hidden = false;
      return;
    }
    if (form._gotcha.value) {
      // Robô preencheu o campo-isca: finge que deu certo e não envia.
      form.hidden = true;
      feito.hidden = false;
      return;
    }
    if (enviando) return;
    enviando = true;
    botao.disabled = true;
    enviar()
      .then(function () {
        form.reset();
        form.hidden = true;
        feito.hidden = false;
      })
      .catch(function () {
        erro.textContent = t('Your request could not be sent. Please try again later.', 'Não foi possível enviar o seu pedido. Tente de novo mais tarde.');
        erro.hidden = false;
      })
      .then(function () { enviando = false; botao.disabled = false; });
  });

  function enviar() {
    if (PEDIDOS.destino.indexOf('docs.google.com/forms') !== -1) {
      // O Google Forms não responde a outro site (resposta opaca): só a falha de rede vira erro.
      var dados = new URLSearchParams();
      Object.keys(PEDIDOS.campos).forEach(function (nome) {
        var c = form[nome];
        dados.append(PEDIDOS.campos[nome], c.type === 'checkbox' ? (c.checked ? 'Yes' : 'No') : c.value.trim());
      });
      return fetch(PEDIDOS.destino, { method: 'POST', mode: 'no-cors', body: dados });
    }
    return fetch(PEDIDOS.destino, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); });
  }

  function mensagem(c) {
    if (c.name === 'email') return t('Please enter a valid e-mail address.', 'Digite um e-mail válido.');
    if (c.name === 'account') return t('Account name: 3 to 16 letters or numbers.', 'Nome da conta: de 3 a 16 letras ou números.');
    if (c.name === 'why') return t('Please tell us why you want in.', 'Conte por que você quer entrar.');
    return t('Please confirm that you understand this is an alpha.', 'Confirme que você entende que é um alfa.');
  }
})();

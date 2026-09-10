/* Bruna F. Nietto — comportamento da página.
   Script clássico com `defer` (e não `type="module"`) para que abrir o
   index.html direto do disco, por file://, continue funcionando. */

(() => {
  'use strict';

  const doc = document;
  const $ = (seletor, raiz = doc) => raiz.querySelector(seletor);
  const $$ = (seletor, raiz = doc) => Array.from(raiz.querySelectorAll(seletor));

  /* --------------------------------------------------- Grupos e trabalhos */

  const grupos = $$('.grupo');

  const obras = $$('.obra').map((figura) => {
    const img = $('img', figura);
    const grupo = figura.closest('.grupo');
    return {
      figura,
      grupo,
      botao: $('.obra__botao', figura),
      src: img.getAttribute('src'),
      alt: img.getAttribute('alt'),
      largura: img.getAttribute('width'),
      altura: img.getAttribute('height'),
      categoria: grupo ? grupo.dataset.categoria : '',
    };
  });

  const obrasVisiveis = () => obras.filter((obra) => !obra.grupo || !obra.grupo.hidden);

  /* ------------------------------------------------------------ Ano atual */

  const ano = $('#ano');
  if (ano) ano.textContent = String(new Date().getFullYear());

  /* ------------------------------------------------ Cabeçalho ao rolar */

  const cabecalho = $('#cabecalho');
  if (cabecalho) {
    let agendado = false;
    const atualizar = () => {
      cabecalho.classList.toggle('is-rolado', window.scrollY > 24);
      agendado = false;
    };
    window.addEventListener('scroll', () => {
      if (agendado) return;
      agendado = true;
      window.requestAnimationFrame(atualizar);
    }, { passive: true });
    atualizar();
  }

  /* ------------------------------------------------------- Menu móvel */

  const menuBotao = $('#menu-botao');
  const menu = $('#menu-principal');

  const fecharMenu = (devolverFoco) => {
    if (!menuBotao || !menu) return;
    menu.classList.remove('is-aberta');
    menuBotao.setAttribute('aria-expanded', 'false');
    if (cabecalho) cabecalho.classList.remove('is-menu-aberto');
    if (devolverFoco) menuBotao.focus();
  };

  if (menuBotao && menu) {
    menuBotao.addEventListener('click', () => {
      const aberto = menuBotao.getAttribute('aria-expanded') === 'true';
      menu.classList.toggle('is-aberta', !aberto);
      menuBotao.setAttribute('aria-expanded', String(!aberto));
      if (cabecalho) cabecalho.classList.toggle('is-menu-aberto', !aberto);
    });

    $$('a', menu).forEach((link) => link.addEventListener('click', () => fecharMenu(false)));

    doc.addEventListener('keydown', (evento) => {
      if (evento.key === 'Escape' && menuBotao.getAttribute('aria-expanded') === 'true') {
        fecharMenu(true);
      }
    });

    window.matchMedia('(min-width: 768px)').addEventListener('change', (e) => {
      if (e.matches) fecharMenu(false);
    });
  }

  /* --------------------------------------------------- Faixa de obras */

  const faixa = $('#faixa');
  const pista = $('#faixa-pista');

  const PASTA_DA_FAIXA = 'assets/img/faixa/';
  const IMAGENS = /\.(svg|png|jpe?g|webp|avif|gif)$/i;

  /* O nginx devolve o conteúdo dessa pasta em JSON (`autoindex_format json`).
     Sem essa location no servidor, ou abrindo o arquivo por file://, a leitura
     falha e a faixa continua saindo das obras do portfólio. */
  const listarPasta = async () => {
    if (window.location.protocol === 'file:') return null;
    try {
      const resposta = await fetch(PASTA_DA_FAIXA, { headers: { Accept: 'application/json' } });
      if (!resposta.ok) return null;
      const lista = await resposta.json();
      if (!Array.isArray(lista)) return null;
      return lista
        .filter((item) => item.type === 'file' && IMAGENS.test(item.name))
        .map((item) => item.name)
        .sort((a, b) => a.localeCompare(b, 'pt-BR'));
    } catch (erro) {
      return null;
    }
  };

  const obraPorArquivo = new Map(obras.map((obra) => [obra.src.split('/').pop(), obra]));

  /* Arquivo com o mesmo nome de uma obra do portfólio herda o alt dela. */
  const itemDaPasta = (nome) => obraPorArquivo.get(nome) || {
    src: PASTA_DA_FAIXA + nome,
    alt: 'Trabalho de Bruna Nietto',
    largura: null,
    altura: null,
  };

  const criarItemDaFaixa = (obra, conjunto, indice, copia) => {
    const item = doc.createElement('li');
    item.className = 'faixa__item' + (copia ? ' faixa__item--copia' : '');

    const botao = doc.createElement('button');
    botao.type = 'button';
    botao.className = 'faixa__botao';

    const img = doc.createElement('img');
    img.src = obra.src;
    img.loading = 'lazy';
    if (obra.largura && obra.altura) {
      img.width = obra.largura;
      img.height = obra.altura;
    }

    if (copia) {
      item.setAttribute('aria-hidden', 'true');
      botao.tabIndex = -1;
      img.alt = '';
    } else {
      img.alt = obra.alt;
    }

    botao.append(img);
    botao.addEventListener('click', () => abrirLightbox(conjunto, indice, botao));
    item.append(botao);
    return item;
  };

  const montarFaixa = async () => {
    if (!faixa || !pista || !obras.length) return;

    const nomes = await listarPasta();
    const conjunto = nomes && nomes.length ? nomes.map(itemDaPasta) : obras;

    // Duas cópias da lista deixam o laço sem emenda em translateX(-50%).
    for (let copia = 0; copia < 2; copia += 1) {
      conjunto.forEach((obra, indice) => {
        pista.append(criarItemDaFaixa(obra, conjunto, indice, copia === 1));
      });
    }
    faixa.classList.add('is-pronta');
  };

  montarFaixa();

  /* ------------------------------------------------------------ Filtros */

  const filtros = $$('.filtro');
  const status = $('#portfolio-status');

  const nomeDoFiltro = (botao) => botao.textContent.trim();

  const aplicarFiltro = (categoria, rotulo) => {
    grupos.forEach((grupo) => {
      grupo.hidden = categoria !== 'todas' && grupo.dataset.categoria !== categoria;
    });
    if (status) {
      const visiveis = obrasVisiveis().length;
      const palavra = visiveis === 1 ? 'trabalho' : 'trabalhos';
      status.textContent = categoria === 'todas'
        ? `Mostrando os ${visiveis} ${palavra}.`
        : `Mostrando ${visiveis} ${palavra} em ${rotulo}.`;
    }
  };

  filtros.forEach((botao) => {
    botao.addEventListener('click', () => {
      filtros.forEach((outro) => outro.setAttribute('aria-pressed', String(outro === botao)));
      aplicarFiltro(botao.dataset.filtro, nomeDoFiltro(botao));
    });
  });

  /* ----------------------------------------------------------- Lightbox */

  const lightbox = $('#lightbox');
  const lightboxImg = $('#lightbox-img');
  const lightboxContador = $('#lightbox-contador');
  const botaoFechar = $('#lightbox-fechar');
  const botaoAnterior = $('#lightbox-anterior');
  const botaoProxima = $('#lightbox-proxima');

  let conjuntoAtual = obras;
  let indiceAtual = 0;
  let origemDoFoco = null;

  const mostrarObra = (indice) => {
    indiceAtual = (indice + conjuntoAtual.length) % conjuntoAtual.length;
    const obra = conjuntoAtual[indiceAtual];
    lightboxImg.src = obra.src;
    lightboxImg.alt = obra.alt;
    if (obra.largura && obra.altura) {
      lightboxImg.width = obra.largura;
      lightboxImg.height = obra.altura;
    } else {
      lightboxImg.removeAttribute('width');
      lightboxImg.removeAttribute('height');
    }
    lightboxContador.textContent = `${indiceAtual + 1} de ${conjuntoAtual.length}`;
  };

  const focalizaveis = () => $$('button', lightbox).filter((el) => !el.disabled);

  const prenderFoco = (evento) => {
    const alvos = focalizaveis();
    if (!alvos.length) return;
    const primeiro = alvos[0];
    const ultimo = alvos[alvos.length - 1];
    if (evento.shiftKey && doc.activeElement === primeiro) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && doc.activeElement === ultimo) {
      evento.preventDefault();
      primeiro.focus();
    }
  };

  const aoTeclar = (evento) => {
    switch (evento.key) {
      case 'Escape':
        evento.preventDefault();
        fecharLightbox();
        break;
      case 'ArrowLeft':
        evento.preventDefault();
        mostrarObra(indiceAtual - 1);
        break;
      case 'ArrowRight':
        evento.preventDefault();
        mostrarObra(indiceAtual + 1);
        break;
      case 'Tab':
        prenderFoco(evento);
        break;
      default:
        break;
    }
  };

  function abrirLightbox(conjunto, indice, origem) {
    if (!lightbox) return;
    conjuntoAtual = conjunto;
    origemDoFoco = origem || null;
    mostrarObra(indice);
    lightbox.hidden = false;
    doc.body.classList.add('sem-rolagem');
    doc.addEventListener('keydown', aoTeclar);
    botaoFechar.focus();
  }

  function fecharLightbox() {
    if (!lightbox || lightbox.hidden) return;
    lightbox.hidden = true;
    doc.body.classList.remove('sem-rolagem');
    doc.removeEventListener('keydown', aoTeclar);
    if (origemDoFoco) origemDoFoco.focus();
    origemDoFoco = null;
  }

  if (lightbox) {
    // O conjunto é o que está visível no momento, e não o portfólio inteiro.
    obras.forEach((obra) => {
      obra.botao.addEventListener('click', () => {
        const conjunto = obrasVisiveis();
        abrirLightbox(conjunto, conjunto.indexOf(obra), obra.botao);
      });
    });

    botaoFechar.addEventListener('click', () => fecharLightbox());
    botaoAnterior.addEventListener('click', () => mostrarObra(indiceAtual - 1));
    botaoProxima.addEventListener('click', () => mostrarObra(indiceAtual + 1));

    lightbox.addEventListener('click', (evento) => {
      if (evento.target === lightbox) fecharLightbox();
    });

    // Deslizar o dedo troca de obra.
    let toqueX = 0;
    let toqueY = 0;
    lightbox.addEventListener('touchstart', (evento) => {
      toqueX = evento.changedTouches[0].clientX;
      toqueY = evento.changedTouches[0].clientY;
    }, { passive: true });

    lightbox.addEventListener('touchend', (evento) => {
      const dx = evento.changedTouches[0].clientX - toqueX;
      const dy = evento.changedTouches[0].clientY - toqueY;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
        mostrarObra(indiceAtual + (dx < 0 ? 1 : -1));
      }
    }, { passive: true });
  }
})();

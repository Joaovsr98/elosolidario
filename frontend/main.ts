import { Component, inject, signal, computed, provideZonelessChangeDetection } from '@angular/core';
import { HttpClient, HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { bootstrapApplication } from '@angular/platform-browser';

import { firstValueFrom } from 'rxjs';

interface Doacao { id: number; nome: string; contato: string; quantidade: number; recebida: number; item: string; campanha: string }
interface Item { id: number; nome: string; unidade: string; meta: number }
interface Campanha { id: number; titulo: string; descricao: string; itens: Item[] }
interface CampanhaPainel { id: number; titulo: string; descricao: string; publicada: boolean; encerrada: boolean; itens: Item[] }
interface Catalogo { instituicao: string; campanhas: Campanha[] }
interface Responsavel { id: number; nome: string; contato: string }
interface InstAdmin { id: number; nome: string; hostname: string | null; contato: string | null; aprovada: boolean; responsaveis: Responsavel[] }
interface RankItem { nome: string; pontos: number }
interface Empresa { nome: string; confirmadas: number }

@Component({
  selector: 'elo-app',
  template: `
    <div class="page">
      <header class="topbar">
        <div class="inner">
          <span class="mark">E</span>
          <span class="brand">Elo Brasil Solidário<small>Rede de solidariedade</small></span>
          <nav class="nav">
            <a href="#empresas">Empresas</a>
            <a href="#cadastrar">Cadastrar</a>
            <a href="#painel">Painel</a>
          </nav>
        </div>
      </header>
      <main>
        @if (retorno()) { <p class="toast" role="status">{{ retorno() }}</p> }
        @if (catalogo(); as dados) {
          <section class="hero">
            <div class="banner">
              <svg class="banner-art" viewBox="0 0 800 360" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
                <defs>
                  <radialGradient id="bg" cx="28%" cy="26%" r="90%">
                    <stop offset="0%" stop-color="#16324f"/><stop offset="100%" stop-color="#091525"/>
                  </radialGradient>
                  <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
                    <feGaussianBlur stdDeviation="5" result="b"/>
                    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
                  </filter>
                </defs>
                <rect width="800" height="360" fill="url(#bg)"/>
                <g stroke="#38bdf8" stroke-opacity="0.22" stroke-width="1.2">
                  <line x1="120" y1="90" x2="210" y2="160"/><line x1="210" y1="160" x2="90" y2="240"/>
                  <line x1="210" y1="160" x2="340" y2="180"/><line x1="260" y1="70" x2="340" y2="180"/>
                  <line x1="340" y1="180" x2="430" y2="110"/><line x1="340" y1="180" x2="300" y2="280"/>
                  <line x1="430" y1="110" x2="470" y2="240"/><line x1="470" y1="240" x2="560" y2="160"/>
                  <line x1="560" y1="160" x2="640" y2="90"/><line x1="560" y1="160" x2="700" y2="210"/>
                  <line x1="700" y1="210" x2="660" y2="310"/><line x1="470" y1="240" x2="540" y2="300"/>
                  <line x1="640" y1="90" x2="730" y2="120"/><line x1="90" y1="240" x2="200" y2="320"/>
                  <line x1="300" y1="280" x2="380" y2="320"/><line x1="430" y1="110" x2="640" y2="90"/>
                </g>
                <g fill="#7dd3fc" fill-opacity="0.9">
                  <circle cx="120" cy="90" r="4"/><circle cx="210" cy="160" r="4"/><circle cx="260" cy="70" r="3"/>
                  <circle cx="300" cy="280" r="4"/><circle cx="430" cy="110" r="4"/><circle cx="560" cy="160" r="4"/>
                  <circle cx="540" cy="300" r="3"/><circle cx="700" cy="210" r="5"/><circle cx="660" cy="310" r="4"/>
                  <circle cx="730" cy="120" r="3"/><circle cx="200" cy="320" r="4"/><circle cx="380" cy="320" r="3"/>
                </g>
                <g fill="#67e8f9" filter="url(#glow)">
                  <circle cx="90" cy="240" r="6"/><circle cx="340" cy="180" r="7"/>
                  <circle cx="470" cy="240" r="6"/><circle cx="640" cy="90" r="6"/>
                </g>
              </svg>
              <div class="banner-text">
                <p class="eyebrow">Instituição · Brasil</p>
                <h1>{{ dados.instituicao }}</h1>
                <p class="lede">Conheça as campanhas abertas e registre sua intenção de doar. A entrega é combinada diretamente com a instituição.</p>
              </div>
            </div>
            <div class="stats">
              <div class="stat"><span class="num">{{ dados.campanhas.length }}</span><span class="lbl">Campanhas abertas</span></div>
              <div class="stat"><span class="num">{{ itensAbertos() }}</span><span class="lbl">Itens buscados</span></div>
              <div class="stat"><span class="num">{{ empresas().length }}</span><span class="lbl">Empresas doadoras</span></div>
            </div>
          </section>
          @for (campanha of dados.campanhas; track campanha.id) {
            <article class="card">
              <h2>{{ campanha.titulo }}</h2>
              <p class="muted">{{ campanha.descricao }}</p>
              <ul class="needs">@for (item of campanha.itens; track item.id) {
                <li>
                  <div class="need-row"><strong>{{ item.nome }}</strong><span class="meta">Meta de {{ item.meta }} {{ item.unidade }}</span></div>
                  <details><summary>Quero doar</summary>
                    <form #form (submit)="$event.preventDefault(); doar(item.id, form)">
                      <label>Nome <input name="nome" required maxlength="160"></label>
                      <label>Contato <input name="contato" required maxlength="255"></label>
                      <label>Empresa (se você representa uma) <input name="empresa" maxlength="160"></label>
                      <label>Quantidade <input name="quantidade" type="number" min="1" max="1000000" required></label>
                      <button [disabled]="ocupado()">Registrar intenção</button>
                    </form>
                  </details>
                </li>
              }</ul>
            </article>
          } @empty { <p class="muted">Nenhuma campanha aberta.</p> }
          <section class="card" id="painel">
            <p class="eyebrow">Área da instituição</p>
            <h2>Painel da instituição</h2>
            @if (doacoes(); as lista) {
              <div class="row-actions"><button class="ghost" [disabled]="ocupado()" (click)="sair()">Sair</button></div>
              <h3>Campanhas</h3>
              @if (campanhas(); as cs) {
                @for (c of cs; track c.id) {
                  <div class="subcard">
                    <h4>{{ c.titulo }}</h4><p class="muted">{{ c.descricao }}</p>
                    <ul class="needs compact">@for (item of c.itens; track item.id) {
                      <li><strong>{{ item.nome }}</strong> <span class="meta">Meta de {{ item.meta }} {{ item.unidade }}</span></li>
                    }</ul>
                    <p>
                      @if (c.encerrada) { <span class="badge off">Encerrada</span> }
                      @else if (c.publicada) { <span class="badge ok">Publicada</span> }
                      @else { <span class="badge warn">Rascunho</span> }
                    </p>
                    @if (c.publicada && !c.encerrada) {
                      <button class="ghost" [disabled]="ocupado()" (click)="encerrar(c.id)">Encerrar campanha</button>
                    }
                  </div>
                } @empty { <p class="muted">Nenhuma campanha cadastrada.</p> }
              }
              <details><summary>Nova campanha</summary>
                <form #nova (submit)="$event.preventDefault(); criarCampanha(nova)">
                  <label>Título <input name="titulo" required maxlength="160"></label>
                  <label>Descrição <textarea name="descricao" required maxlength="2000"></textarea></label>
                  @for (linha of linhasArr(); track linha) {
                    <fieldset>
                      <label>Item <input name="item_nome" maxlength="160"></label>
                      <label>Unidade <input name="item_unidade" maxlength="40"></label>
                      <label>Meta <input name="item_meta" type="number" min="1" max="1000000"></label>
                    </fieldset>
                  }
                  <div class="row-actions">
                    <button type="button" class="ghost" [disabled]="ocupado()" (click)="linhas.set(linhas() + 1)">Adicionar item</button>
                    <button [disabled]="ocupado()">Publicar campanha</button>
                  </div>
                </form>
              </details>
              <h3>Intenções recebidas</h3>
              @for (doacao of lista; track doacao.id) {
                <div class="subcard">
                  <div class="need-row"><strong>{{ doacao.campanha }}</strong>
                    @if (doacao.recebida) { <span class="badge ok">Recebida</span> }
                  </div>
                  <p class="meta">{{ doacao.quantidade }} × {{ doacao.item }}</p>
                  <p class="muted">{{ doacao.nome }} · {{ doacao.contato }}</p>
                  @if (!doacao.recebida) {
                    <button [disabled]="ocupado()" (click)="receber(doacao.id)">Confirmar recebimento</button>
                  }
                </div>
              } @empty { <p class="muted">Nenhuma intenção registrada.</p> }
            } @else {
              <p class="muted">Acesse com o código da instituição para publicar campanhas e confirmar doações.</p>
              <form #login (submit)="$event.preventDefault(); entrar(login)">
                <label>Código da instituição <input name="codigo" type="password" required autocomplete="current-password"></label>
                <button [disabled]="ocupado()">Entrar</button>
              </form>
            }
          </section>
        } @else {
          <section class="hero">
            <p class="eyebrow">Elo Brasil Solidário</p>
            <p class="lede" role="status">{{ mensagem() }}</p>
          </section>
        }
        <section class="card" id="empresas">
          <h2>Empresas doadoras</h2>
          <h3>Top 10 do trimestre</h3>
          <ol class="rank">@for (empresa of ranking(); track empresa.nome) {
            <li><span class="rank-name">{{ empresa.nome }}</span><span class="meta">{{ empresa.pontos }} confirmada(s)</span></li>
          } @empty { <li class="empty">Ainda sem doações confirmadas neste trimestre.</li> }</ol>
          <h3>Diretório</h3>
          <form #busca class="search" (submit)="$event.preventDefault(); buscarEmpresas(busca)">
            <input name="q" maxlength="160" placeholder="Buscar empresa">
            <button class="ghost">Buscar</button>
          </form>
          <ul class="dir">@for (empresa of empresas(); track empresa.nome) {
            <li>{{ empresa.nome }}@if (empresa.confirmadas) { <span class="meta"> · {{ empresa.confirmadas }} confirmada(s)</span> }</li>
          } @empty { <li class="empty">Nenhuma empresa encontrada.</li> }</ul>
        </section>
        <details class="accordion" id="cadastrar"><summary>Cadastrar minha instituição</summary>
          <div class="acc-body">
            <form #cad (submit)="$event.preventDefault(); cadastrar(cad)">
              <label>Nome da instituição <input name="nome" required maxlength="160"></label>
              <label>Contato da instituição <input name="contato" maxlength="255"></label>
              <label>Seu nome <input name="resp_nome" required maxlength="160"></label>
              <label>Seu contato <input name="resp_contato" required maxlength="255"></label>
              <button [disabled]="ocupado()">Enviar cadastro</button>
            </form>
          </div>
        </details>
        <details class="accordion"><summary>Administração</summary>
          <div class="acc-body">
            @if (instituicoes(); as insts) {
              <div class="row-actions"><button class="ghost" [disabled]="ocupado()" (click)="sairAdmin()">Sair da administração</button></div>
              @if (codigoGerado(); as codigo) {
                <p class="codebox" role="status">Código gerado (copie agora, aparece só uma vez):<br>{{ codigo }}</p>
              }
              @for (i of insts; track i.id) {
                <div class="subcard">
                  <div class="need-row"><strong>{{ i.nome }}</strong>
                    @if (i.aprovada) { <span class="badge ok">Aprovada</span> } @else { <span class="badge warn">Pendente</span> }
                  </div>
                  @if (i.aprovada) { <p class="meta">{{ i.hostname }}</p> }
                  @if (i.contato) { <p class="muted">Contato: {{ i.contato }}</p> }
                  <ul class="dir">@for (r of i.responsaveis; track r.id) {
                    <li>{{ r.nome }} <span class="meta">· {{ r.contato }}</span></li>
                  }</ul>
                  @if (i.aprovada) {
                    <button class="ghost" [disabled]="ocupado()" (click)="regerar(i.id)">Gerar novo código</button>
                  } @else {
                    <form #ap (submit)="$event.preventDefault(); aprovar(i.id, ap)">
                      <label>Domínio <input name="hostname" required maxlength="253" placeholder="nome.elo.vnbueno.com.br"></label>
                      <button [disabled]="ocupado()">Aprovar e gerar código</button>
                    </form>
                  }
                </div>
              } @empty { <p class="muted">Nenhuma instituição.</p> }
            } @else {
              <form #adm (submit)="$event.preventDefault(); entrarAdmin(adm)">
                <label>Chave de administrador <input name="codigo" type="password" required autocomplete="current-password"></label>
                <button [disabled]="ocupado()">Entrar</button>
              </form>
            }
          </div>
        </details>
      </main>
      <footer>Elo Brasil Solidário · Projeto de extensão UNASP · InovaTec</footer>
    </div>
  `,
  styles: [`
    :host{
      --bg:#081020;--surface:#0e1b30;--surface-2:#13223b;
      --line:rgba(255,255,255,.08);--line-2:rgba(255,255,255,.16);
      --text:#eef4fb;--muted:#93a7c2;
      --gold:#2bc4e6;--gold-2:#5fd4ef;
      --green:#7dd3fc;--green-2:#a9e4fd;--green-soft:rgba(56,189,248,.14);
      --amber:#d9a441;--danger:#e68b82;--radius:18px;
      display:block;color:var(--text);line-height:1.55;
      font-family:'DM Sans',system-ui,sans-serif;
    }
    @keyframes rise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
    .page{min-height:100vh;display:flex;flex-direction:column;
      background:
        radial-gradient(1100px 560px at 50% -14%, rgba(56,189,248,.16), transparent 62%),
        radial-gradient(780px 480px at 90% 4%, rgba(43,196,230,.08), transparent 55%),
        var(--bg);}
    .topbar{position:sticky;top:0;z-index:5;background:rgba(10,19,36,.78);
      backdrop-filter:blur(12px);border-bottom:1px solid var(--line)}
    .topbar .inner{max-width:880px;margin:0 auto;padding:.8rem 1.25rem;display:flex;align-items:center;gap:.7rem}
    .mark{display:grid;place-items:center;width:36px;height:36px;border-radius:11px;flex:none;
      border:1px solid var(--gold);color:var(--gold);background:rgba(207,169,104,.08);
      font-family:'Fraunces',Georgia,serif;font-weight:600;font-size:1.15rem}
    .brand{font-weight:700;letter-spacing:.2px;line-height:1.1}
    .brand small{display:block;font-weight:500;font-size:.68rem;color:var(--muted);
      letter-spacing:.16em;text-transform:uppercase}
    .nav{margin-left:auto;display:flex;gap:1.1rem;align-items:center}
    .nav a{color:var(--muted);text-decoration:none;font-size:.9rem;font-weight:500;transition:color .15s}
    .nav a:hover{color:var(--green-2)}
    [id]{scroll-margin-top:74px}
    @media (max-width:560px){ .nav{display:none} }
    main{width:100%;max-width:880px;margin:0 auto;padding:1rem 1.25rem 3.5rem;box-sizing:border-box;flex:1}
    .toast{margin:1rem 0;padding:.75rem 1rem;border-radius:12px;font-weight:500;
      background:var(--green-soft);border:1px solid rgba(70,185,129,.4);color:var(--green-2)}
    .hero{padding:1.8rem 0 .5rem}
    .banner{position:relative;border-radius:22px;overflow:hidden;border:1px solid var(--line);
      min-height:300px;display:flex;align-items:flex-end;animation:rise .55s ease both;
      box-shadow:0 22px 50px rgba(0,0,0,.4)}
    .banner-art{position:absolute;inset:0;width:100%;height:100%}
    .banner-text{position:relative;width:100%;padding:1.7rem 1.7rem 1.9rem;box-sizing:border-box;
      background:linear-gradient(to top, rgba(8,16,32,.93) 12%, rgba(8,16,32,.35) 58%, transparent)}
    .banner-text .lede{max-width:48ch}
    @media (max-width:560px){ .banner{min-height:240px} .banner-text{padding:1.3rem 1.2rem 1.4rem} }
    .eyebrow{font-size:.74rem;letter-spacing:.2em;text-transform:uppercase;color:var(--green-2);font-weight:600;margin:0 0 .55rem}
    h1{font-family:'Fraunces',Georgia,serif;font-weight:500;font-size:clamp(2.1rem,6.5vw,3.4rem);
      line-height:1.04;letter-spacing:-.01em;margin:.1rem 0 .55rem}
    .lede{color:var(--muted);max-width:54ch;font-size:1.06rem;margin:0}
    .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:.7rem;margin:1.5rem 0 .3rem}
    .stat{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:.9rem 1rem;animation:rise .5s ease both}
    .stat .num{display:block;font-family:'Fraunces',Georgia,serif;font-weight:600;font-size:1.75rem;line-height:1;color:var(--green-2)}
    .stat .lbl{display:block;margin-top:.35rem;font-size:.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:.09em}
    @media (max-width:560px){ .stats{gap:.5rem} .stat{padding:.7rem .75rem} .stat .num{font-size:1.4rem} }
    .card{background:linear-gradient(180deg,var(--surface),#0c1829);border:1px solid var(--line);
      border-radius:var(--radius);padding:1.3rem;margin:1.1rem 0;
      transition:transform .2s ease,border-color .2s ease,box-shadow .2s ease;animation:rise .5s ease both}
    .card:hover{transform:translateY(-2px);border-color:var(--line-2);box-shadow:0 18px 40px rgba(0,0,0,.35)}
    h2{font-family:'Fraunces',Georgia,serif;font-weight:500;font-size:1.5rem;margin:0 0 .5rem}
    h3{font-size:.76rem;text-transform:uppercase;letter-spacing:.15em;color:var(--green-2);
      font-weight:600;margin:1.5rem 0 .7rem}
    h4{font-family:'Fraunces',Georgia,serif;font-weight:500;font-size:1.12rem;margin:0 0 .3rem}
    p{margin:.35rem 0}
    .muted{color:var(--muted)}
    .meta{color:var(--muted);font-size:.9rem}
    strong{font-weight:600}
    .need-row{display:flex;align-items:center;justify-content:space-between;gap:.6rem;flex-wrap:wrap}
    ul.needs{list-style:none;padding:0;margin:.7rem 0;display:grid;gap:.6rem}
    ul.needs>li{background:var(--surface-2);border:1px solid var(--line);border-radius:14px;padding:.8rem .9rem}
    ul.needs.compact>li{padding:.5rem .7rem}
    .subcard{background:var(--surface-2);border:1px solid var(--line);border-radius:14px;padding:1rem;margin:.75rem 0}
    button,.btn{font:inherit;font-weight:600;cursor:pointer;border:0;border-radius:999px;
      padding:.62rem 1.2rem;background:linear-gradient(135deg,var(--gold),#1b9fd8);color:#04121d;transition:.15s;
      display:inline-flex;align-items:center;gap:.4rem;box-shadow:0 6px 18px rgba(43,196,230,.2)}
    button:hover:not(:disabled){filter:brightness(1.08)}
    button:disabled{opacity:.5;cursor:not-allowed}
    button.ghost{background:rgba(255,255,255,.06);color:var(--text);border:1px solid var(--line-2)}
    button.ghost:hover:not(:disabled){background:rgba(255,255,255,.12)}
    .row-actions{display:flex;gap:.6rem;flex-wrap:wrap;margin:.7rem 0}
    label{display:block;margin:.6rem 0;color:var(--muted);font-size:.9rem}
    input,textarea{display:block;width:100%;box-sizing:border-box;margin-top:.3rem;
      background:#1c3052;color:var(--text);border:1px solid var(--line-2);border-radius:12px;
      padding:.62rem .78rem;font:inherit;transition:border-color .15s,box-shadow .15s}
    input::placeholder{color:#8ea3bf}
    input:focus,textarea:focus{outline:0;border-color:var(--green);box-shadow:0 0 0 3px var(--green-soft)}
    textarea{min-height:92px;resize:vertical}
    fieldset{border:1px dashed var(--line-2);border-radius:12px;padding:.4rem .85rem .7rem;margin:.65rem 0}
    form{margin:.5rem 0}
    .search{display:flex;gap:.5rem;align-items:center}
    .search input{flex:1;margin-top:0;background-color:#1c3052;
      background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%2393a7c2' stroke-width='2' stroke-linecap='round' viewBox='0 0 24 24'%3E%3Ccircle cx='11' cy='11' r='7'/%3E%3Cpath d='M20 20l-3.5-3.5'/%3E%3C/svg%3E");
      background-repeat:no-repeat;background-position:.75rem center;padding-left:2.2rem}
    .search button{flex:none}
    .badge{display:inline-block;padding:.22rem .66rem;border-radius:999px;font-size:.76rem;font-weight:600}
    .badge.ok{background:var(--green-soft);color:var(--green-2)}
    .badge.warn{background:rgba(217,164,65,.16);color:var(--amber)}
    .badge.off{background:rgba(224,119,107,.16);color:var(--danger)}
    ol.rank{list-style:none;counter-reset:r;padding:0;margin:.6rem 0;display:grid;gap:.5rem}
    ol.rank>li{counter-increment:r;display:flex;align-items:center;gap:.85rem;
      background:var(--surface-2);border:1px solid var(--line);border-radius:12px;padding:.65rem .85rem}
    ol.rank>li::before{content:counter(r);display:grid;place-items:center;width:28px;height:28px;flex:none;
      border-radius:8px;background:var(--green-soft);color:var(--green-2);font-weight:700;font-size:.85rem}
    ol.rank>li.empty::before{display:none}
    .rank-name{flex:1;font-weight:500}
    ul.dir{list-style:none;padding:0;margin:.6rem 0;display:grid;gap:.4rem}
    ul.dir>li{background:var(--surface-2);border:1px solid var(--line);border-radius:10px;padding:.5rem .8rem;font-size:.95rem}
    li.empty{background:transparent;border:0;color:var(--muted);padding:.4rem 0}
    .codebox{font-family:ui-monospace,'Cascadia Code',monospace;word-break:break-all;
      background:#16273f;border:1px dashed var(--gold);border-radius:12px;padding:.7rem .85rem;color:var(--gold-2)}
    details.accordion{border:1px solid var(--line);border-radius:var(--radius);background:var(--surface);margin:1.1rem 0;overflow:hidden}
    details.accordion>summary{cursor:pointer;padding:1rem 1.25rem;font-weight:600;list-style:none;display:flex;align-items:center}
    details.accordion>summary::-webkit-details-marker{display:none}
    details.accordion>summary::after{content:'+';margin-left:auto;color:var(--green-2);font-weight:700;font-size:1.15rem}
    details.accordion[open]>summary::after{content:'–'}
    details.accordion[open]>summary{border-bottom:1px solid var(--line)}
    .acc-body{padding:1.1rem 1.25rem}
    details:not(.accordion){margin:.5rem 0}
    details:not(.accordion)>summary{cursor:pointer;list-style:none;color:var(--green-2);font-weight:600;padding:.35rem 0}
    details:not(.accordion)>summary::-webkit-details-marker{display:none}
    details:not(.accordion)>summary::before{content:'→ ';color:var(--green-2)}
    details:not(.accordion)[open]>summary::before{content:'↓ '}
    footer{border-top:1px solid var(--line);color:var(--muted);font-size:.84rem;text-align:center;padding:1.6rem 1.25rem}
    @media (max-width:560px){ main{padding:1rem 1rem 3rem} .card{padding:1.1rem} }
    @media (prefers-reduced-motion:reduce){ .card,.hero{animation:none} .card:hover{transform:none} }
  `]
})
class App {
  readonly catalogo = signal<Catalogo | null>(null);
  readonly mensagem = signal('Carregando campanhas…');

  private readonly http = inject(HttpClient);
  readonly doacoes = signal<Doacao[] | null>(null);
  readonly campanhas = signal<CampanhaPainel[] | null>(null);
  readonly linhas = signal(1);
  readonly linhasArr = computed(() => Array.from({ length: this.linhas() }, (_, i) => i));
  readonly itensAbertos = computed(() => (this.catalogo()?.campanhas ?? []).reduce((soma, c) => soma + c.itens.length, 0));
  readonly instituicoes = signal<InstAdmin[] | null>(null);
  readonly codigoGerado = signal('');
  readonly ranking = signal<RankItem[]>([]);
  readonly empresas = signal<Empresa[]>([]);
  readonly retorno = signal('');
  readonly ocupado = signal(false);

  doar(item: number, form: HTMLFormElement) {
    const dados = new FormData(form);
    void this.acao('/api/doacoes', {
      item, nome: dados.get('nome'), contato: dados.get('contato'),
      empresa: dados.get('empresa'), quantidade: Number(dados.get('quantidade'))
    }, async () => {
      form.reset();
      this.retorno.set('Intenção registrada. A instituição poderá entrar em contato.');
    });
  }

  entrar(form: HTMLFormElement) {
    void this.acao('/api/painel/entrar', { codigo: new FormData(form).get('codigo') }, async () => {
      form.reset();
      await this.carregarPainel();
    });
  }

  sair() {
    void this.acao('/api/painel/sair', {}, async () => { this.doacoes.set(null); this.campanhas.set(null); });
  }

  receber(id: number) {
    void this.acao('/api/painel/receber', { id }, async () => {
      await this.carregarPainel();
      this.retorno.set('Recebimento confirmado.');
    });
  }

  criarCampanha(form: HTMLFormElement) {
    const dados = new FormData(form);
    const nomes = dados.getAll('item_nome');
    const unidades = dados.getAll('item_unidade');
    const metas = dados.getAll('item_meta');
    const itens = nomes.map((nome, i) => ({
      nome: String(nome).trim(),
      unidade: String(unidades[i] ?? '').trim(),
      meta: Number(metas[i])
    })).filter(item => item.nome || item.unidade || item.meta);
    void this.acao('/api/painel/campanhas', {
      titulo: dados.get('titulo'), descricao: dados.get('descricao'), itens
    }, async () => {
      form.reset();
      this.linhas.set(1);
      await this.carregarCampanhas();
      this.retorno.set('Campanha publicada.');
    });
  }

  encerrar(id: number) {
    void this.acao('/api/painel/campanhas/encerrar', { id }, async () => {
      await this.carregarCampanhas();
      this.retorno.set('Campanha encerrada.');
    });
  }

  private async carregarPainel() {
    this.doacoes.set(await firstValueFrom(this.http.get<Doacao[]>('/api/painel/doacoes')));
    await this.carregarCampanhas();
  }

  private async carregarCampanhas() {
    this.campanhas.set(await firstValueFrom(this.http.get<CampanhaPainel[]>('/api/painel/campanhas')));
  }

  buscarEmpresas(form: HTMLFormElement) {
    const q = String(new FormData(form).get('q') ?? '');
    this.http.get<Empresa[]>('/api/empresas', { params: { q } }).subscribe({
      next: dados => this.empresas.set(dados), error: () => {}
    });
  }

  private carregarEmpresas() {
    this.http.get<RankItem[]>('/api/ranking').subscribe({ next: dados => this.ranking.set(dados), error: () => {} });
    this.http.get<Empresa[]>('/api/empresas').subscribe({ next: dados => this.empresas.set(dados), error: () => {} });
  }

  cadastrar(form: HTMLFormElement) {
    const dados = new FormData(form);
    void this.acao('/api/cadastro', {
      nome: dados.get('nome'), contato: dados.get('contato'),
      responsavel: { nome: dados.get('resp_nome'), contato: dados.get('resp_contato') }
    }, async () => {
      form.reset();
      this.retorno.set('Cadastro enviado. A plataforma vai avaliar e entrar em contato.');
    });
  }

  entrarAdmin(form: HTMLFormElement) {
    const codigo = new FormData(form).get('codigo');
    this.ocupado.set(true);
    this.retorno.set('');
    void firstValueFrom(this.http.post('/api/admin/entrar', { codigo }))
      .then(() => { form.reset(); return this.carregarAdmin(); })
      .catch((erro: unknown) => this.tratarErro(erro))
      .finally(() => this.ocupado.set(false));
  }

  sairAdmin() {
    void this.acao('/api/admin/sair', {}, async () => { this.instituicoes.set(null); this.codigoGerado.set(''); });
  }

  aprovar(id: number, form: HTMLFormElement) {
    void this.acaoCodigo('/api/admin/aprovar', { id, hostname: new FormData(form).get('hostname') }, 'Instituição aprovada.');
  }

  regerar(id: number) {
    void this.acaoCodigo('/api/admin/codigo', { id }, 'Novo código gerado.');
  }

  private async carregarAdmin() {
    this.instituicoes.set(await firstValueFrom(this.http.get<InstAdmin[]>('/api/admin/instituicoes')));
  }

  private async acaoCodigo(path: string, dados: object, msg: string) {
    this.ocupado.set(true);
    this.retorno.set('');
    this.codigoGerado.set('');
    try {
      const resposta = await firstValueFrom(this.http.post<{ codigo: string }>(path, dados));
      this.codigoGerado.set(resposta.codigo);
      await this.carregarAdmin();
      this.retorno.set(msg);
    } catch (erro: unknown) {
      if (erro instanceof HttpErrorResponse && erro.status === 401) this.instituicoes.set(null);
      this.tratarErro(erro);
    } finally {
      this.ocupado.set(false);
    }
  }

  private tratarErro(erro: unknown) {
    this.retorno.set(erro instanceof HttpErrorResponse && typeof erro.error?.erro === 'string'
      ? erro.error.erro : 'Não foi possível concluir a solicitação.');
  }

  private async acao(path: string, dados: object, sucesso: () => Promise<void>) {
    this.ocupado.set(true);
    this.retorno.set('');
    try {
      await firstValueFrom(this.http.post(path, dados));
      await sucesso();
    } catch (erro: unknown) {
      if (erro instanceof HttpErrorResponse && erro.status === 401) this.doacoes.set(null);
      this.tratarErro(erro);
    } finally {
      this.ocupado.set(false);
    }
  }

  constructor() {
    this.carregarEmpresas();
    void this.carregarPainel().catch(() => {});
    this.http.get<Catalogo>('/api/campanhas').subscribe({
      next: dados => this.catalogo.set(dados),
      error: erro => this.mensagem.set(erro.status === 404
        ? 'Instituição indisponível neste endereço.' : 'Não foi possível carregar as campanhas.')
    });
  }
}

bootstrapApplication(App, { providers: [provideHttpClient(), provideZonelessChangeDetection()] });

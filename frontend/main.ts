import { Component, inject, signal, computed, effect, provideZonelessChangeDetection } from '@angular/core';
import { HttpClient, HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { bootstrapApplication } from '@angular/platform-browser';

import { firstValueFrom } from 'rxjs';

interface Doacao { id: number; nome: string; contato: string; quantidade: number; recebida: number; item: string; campanha: string }
interface Item { id: number; nome: string; unidade: string; meta: number; recebido?: number }
interface Campanha { id: number; titulo: string; descricao: string; itens: Item[] }
interface CampanhaPainel { id: number; titulo: string; descricao: string; publicada: boolean; encerrada: boolean; itens: Item[] }
interface Catalogo { instituicao: string; campanhas: Campanha[] }
interface Responsavel { id: number; nome: string; contato: string }
interface InstAdmin { id: number; nome: string; hostname: string | null; contato: string | null; aprovada: boolean; responsaveis: Responsavel[] }
interface RankItem { nome: string; pontos: number }
interface Empresa { nome: string; confirmadas: number; selos: string[] }
interface CampanhaAdmin { id: number; titulo: string; instituicao: string }
interface IndicAdmin { aprovadas: number; pendentes: number; campanhas: number; intencoes: number; recebidas: number; empresas: number }
interface OpcaoTrimestre { chave: string; ano: number; tri: number; rotulo: string }
interface CampanhaPublica { id: number; titulo: string; itens: number }
interface InstPublica { id: number; nome: string; hostname: string; campanhas: CampanhaPublica[] }

@Component({
  selector: 'elo-app',
  template: `
    <div class="page">
      <a class="pular" href="#conteudo">Pular para o conteúdo</a>
      <header class="topbar">
        <div class="inner">
          <span class="mark vn-elo-mark">E</span>
          <span class="brand">Elo Brasil Solidário</span>
          <nav class="nav" aria-label="Navegação principal">
            <a href="#explorar">Instituições</a>
            <a href="#empresas">Empresas</a>
            <a href="#cadastrar">Cadastrar instituição</a>
            <a href="#painel" aria-label="Entrar na área da instituição">Entrar</a>
          </nav>
        </div>
      </header>
      <main id="conteudo">
        @if (retorno()) {
          <p class="toast" [class.erro]="retornoErro()" role="status">
            <span>{{ retorno() }}</span>
            <button type="button" class="fechar" aria-label="Fechar aviso" (click)="retorno.set('')">×</button>
          </p>
        }
        @if (catalogo(); as dados) {
          <section class="institution-head">
            <h1>{{ dados.instituicao }}</h1>
            <p class="institution-info">
              {{ dados.campanhas.length }} {{ dados.campanhas.length === 1 ? 'campanha aberta' : 'campanhas abertas' }}
              <span aria-hidden="true">·</span>
              {{ itensAbertos() }} {{ itensAbertos() === 1 ? 'tipo de item solicitado' : 'tipos de itens solicitados' }}
            </p>
          </section>
          <section id="campanhas-abertas" class="campaign-list" aria-labelledby="campaign-heading">
            <h2 id="campaign-heading" class="section-heading">O que estamos arrecadando</h2>
            <p class="delivery-note">Informe o que pode doar. A instituição combina a entrega com você. Não é necessário criar uma conta.</p>
          @for (campanha of dados.campanhas; track campanha.id) {
            <article class="campaign">
              <h3>{{ campanha.titulo }}</h3>
              <p class="muted">{{ campanha.descricao }}</p>
              <ul class="needs">@for (item of campanha.itens; track item.id) {
                <li>
                  <div class="item-info">
                    <div class="need-row"><strong>{{ item.nome }}</strong><span class="meta">{{ item.recebido || 0 }} de {{ item.meta }} {{ item.unidade }}</span></div>
                    <div class="bar" role="progressbar" [attr.aria-label]="'Arrecadação de ' + item.nome" [attr.aria-valuenow]="pct(item)" aria-valuemin="0" aria-valuemax="100"><span [style.width.%]="pct(item)"></span></div>
                  </div>
                  <details class="donation-form"><summary>Oferecer doação</summary>
                    <form #form (submit)="$event.preventDefault(); doar(item.id, form)">
                      <label>Nome <input name="nome" required maxlength="160"></label>
                      <label>Contato <input name="contato" required maxlength="255"></label>
                      <label>Empresa (opcional) <input name="empresa" maxlength="160"></label>
                      <p class="meta nota">O nome da empresa poderá aparecer na lista pública de doadores. Valores e quantidades não serão exibidos.</p>
                      <label>Quantidade <input name="quantidade" type="number" min="1" max="1000000" required></label>
                      <label class="check"><input type="checkbox" name="consentimento" required> Concordo com o uso do meu nome e contato para intermediar esta doação (LGPD). <a class="link" href="#privacidade" (click)="abrirPrivacidade()">Ver política</a></label>
                      <button [disabled]="ocupado()">Enviar</button>
                    </form>
                  </details>
                </li>
              }</ul>
            </article>
          } @empty { <p class="muted">Não há campanhas abertas no momento.</p> }
            </section>
          <section class="card" id="painel">
            
            <h2>Painel da instituição</h2>
            @if (doacoes(); as lista) {
              <div class="row-actions"><button class="ghost" [disabled]="ocupado()" (click)="sair()">Sair</button></div>
              <div class="stats painel-stats">
                <div class="stat"><span class="num">{{ resumoPainel().campanhas }}</span><span class="lbl">Campanhas ativas</span></div>
                <div class="stat"><span class="num">{{ resumoPainel().pendentes }}</span><span class="lbl">Doações pendentes</span></div>
                <div class="stat"><span class="num">{{ resumoPainel().recebidas }}</span><span class="lbl">Doações recebidas</span></div>
              </div>
              <h3>Campanhas</h3>
              @if (campanhas(); as cs) {
                @for (c of cs; track c.id) {
                  <div class="subcard">
                    <h4>{{ c.titulo }}</h4><p class="muted">{{ c.descricao }}</p>
                    <ul class="needs compact">@for (item of c.itens; track item.id) {
                      <li>
                        <div class="need-row"><strong>{{ item.nome }}</strong><span class="meta">{{ item.recebido || 0 }} de {{ item.meta }} {{ item.unidade }}</span></div>
                        <div class="bar"><span [style.width.%]="pct(item)"></span></div>
                      </li>
                    }</ul>
                    <p>
                      @if (c.encerrada) { <span class="badge off">Encerrada</span> }
                      @else if (c.publicada) { <span class="badge ok">Publicada</span> }
                      @else { <span class="badge warn">Rascunho</span> }
                    </p>
                    <div class="row-actions">
                      @if (!c.publicada) { <button [disabled]="ocupado()" (click)="publicar(c.id)">Publicar</button> }
                      @if (c.publicada && !c.encerrada) { <button class="ghost" [disabled]="ocupado()" (click)="encerrar(c.id)">Encerrar</button> }
                    </div>
                    <details><summary>Editar campanha</summary>
                      <form #ed (submit)="$event.preventDefault(); editarCampanha(c.id, ed)">
                        <label>Título <input name="titulo" [value]="c.titulo" required maxlength="160"></label>
                        <label>Descrição <textarea name="descricao" required maxlength="2000">{{ c.descricao }}</textarea></label>
                        <button [disabled]="ocupado()">Salvar alterações</button>
                      </form>
                    </details>
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
                  <label class="check"><input type="checkbox" name="publicar" checked> Publicar agora (desmarque para salvar como rascunho)</label>
                  <div class="row-actions">
                    <button type="button" class="ghost" [disabled]="ocupado()" (click)="linhas.set(linhas() + 1)">Adicionar item</button>
                    <button [disabled]="ocupado()">Criar campanha</button>
                  </div>
                </form>
              </details>
              <h3>Intenções de doação</h3>
              <div class="filtros">
                <button type="button" class="ghost" [class.ativo]="filtroDoacoes() === 'todas'" (click)="filtroDoacoes.set('todas')">Todas ({{ resumoPainel().intencoes }})</button>
                <button type="button" class="ghost" [class.ativo]="filtroDoacoes() === 'pendentes'" (click)="filtroDoacoes.set('pendentes')">Pendentes ({{ resumoPainel().pendentes }})</button>
                <button type="button" class="ghost" [class.ativo]="filtroDoacoes() === 'recebidas'" (click)="filtroDoacoes.set('recebidas')">Recebidas ({{ resumoPainel().recebidas }})</button>
                <button type="button" class="ghost" [disabled]="!lista.length" (click)="exportarCsv()">Exportar CSV</button>
              </div>
              @for (doacao of doacoesFiltradas(); track doacao.id) {
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
              } @empty { <p class="muted">Não há doações neste filtro.</p> }
              <h3>Responsáveis</h3>
              <ul class="dir">@for (r of responsaveisPainel(); track r.id) {
                <li class="need-row"><span>{{ r.nome }} <span class="meta">· {{ r.contato }}</span></span>
                  @if (responsaveisPainel().length > 1) {
                    <button type="button" class="ghost mini" [disabled]="ocupado()" (click)="removerResponsavel(r.id, r.nome)">Remover</button>
                  }
                </li>
              } @empty { <li class="empty">Nenhum responsável cadastrado.</li> }</ul>
              <details><summary>Adicionar responsável</summary>
                <form #resp (submit)="$event.preventDefault(); adicionarResponsavel(resp)">
                  <label>Nome <input name="nome" required maxlength="160"></label>
                  <label>Contato <input name="contato" required maxlength="255"></label>
                  <button [disabled]="ocupado()">Adicionar</button>
                </form>
              </details>
            } @else {
              <p class="muted">Acesse com o código da instituição para publicar campanhas e confirmar doações.</p>
              <form #login (submit)="$event.preventDefault(); entrar(login)">
                <label>Código da instituição <input name="codigo" type="password" required autocomplete="current-password"></label>
                <button [disabled]="ocupado()">Entrar</button>
              </form>
            }
          </section>
        } @else if (carregandoCatalogo()) {
          <section class="hero">
            <div class="skel sk-banner"></div>
            <div class="stats">
              <div class="skel sk-stat"></div><div class="skel sk-stat"></div><div class="skel sk-stat"></div>
            </div>
          </section>
          <article class="card">
            <div class="skel sk-line sk-line-lg"></div>
            <div class="skel sk-line"></div>
            <div class="subcard"><div class="skel sk-line"></div><div class="skel sk-row"></div></div>
          </article>
        } @else {
          <section class="hero">
            <h1>Elo Brasil Solidário</h1>
            <p class="lede" role="status">{{ mensagem() }}</p>
          </section>
        }
        <section class="card" id="empresas">
          <h2>Empresas doadoras</h2>
          <div class="need-row ranking-head">
            <h3>Ranking trimestral</h3>
            <select class="sel" aria-label="Trimestre do ranking" (change)="mudarTrimestre($any($event.target).value)">
              @for (op of opcoesTrimestre(); track op.chave) {
                <option [value]="op.chave" [selected]="op.chave === trimestreSel()">{{ op.rotulo }}</option>
              }
            </select>
          </div>
          @if (carregandoEmpresas()) {
            <div class="skel sk-row"></div><div class="skel sk-row"></div>
          } @else {
            <ol class="rank">@for (empresa of ranking(); track empresa.nome) {
              <li><span class="rank-name">{{ empresa.nome }}
                  @if (selosDe(empresa.nome).length) { <span class="selos">@for (s of selosDe(empresa.nome); track s) { <span class="selo">{{ s }}</span> }</span> }
                </span><span class="meta">{{ empresa.pontos }} confirmada(s)</span></li>
            } @empty { <li class="empty">Ainda sem doações confirmadas neste trimestre.</li> }</ol>
          }
          <h3>Lista de doadores</h3>
          <p class="meta">Pesquise pelo nome da empresa.</p>
          <form #busca class="search" (submit)="$event.preventDefault(); buscarEmpresas(busca)">
            <input name="q" maxlength="160" placeholder="Buscar empresa" aria-label="Buscar empresa">
            <button class="ghost">Buscar</button>
          </form>
          @if (carregandoEmpresas()) {
            <div class="skel sk-row"></div><div class="skel sk-row"></div>
          } @else {
            <ul class="dir">@for (empresa of empresas(); track empresa.nome) {
              <li><strong>{{ empresa.nome }}</strong>@if (empresa.confirmadas) { <span class="meta"> · {{ empresa.confirmadas }} confirmada(s)</span> }
                @if (empresa.selos.length) { <span class="selos">@for (s of empresa.selos; track s) { <span class="selo">{{ s }}</span> }</span> }
              </li>
            } @empty { <li class="empty">Nenhuma empresa encontrada.</li> }</ul>
          }
        </section>
        <section class="card" id="explorar">
          <h2>Instituições</h2>
          <p class="meta">Encontre instituições que estão recebendo doações.</p>
          <form #exp class="search" (submit)="$event.preventDefault(); explorar(exp)">
            <input name="q" maxlength="160" placeholder="Buscar instituição ou campanha" aria-label="Buscar instituição ou campanha">
            <button class="ghost">Buscar</button>
          </form>
          @if (carregandoExplorar()) {
            <div class="skel sk-row"></div><div class="skel sk-row"></div>
          } @else {
            @for (inst of instituicoesPublicas(); track inst.id) {
              <div class="subcard">
                <div class="need-row"><strong>{{ inst.nome }}</strong>
                  <a class="link" [href]="'https://' + inst.hostname" target="_blank" rel="noopener noreferrer">Visitar →</a>
                </div>
                <ul class="dir">@for (c of inst.campanhas; track c.id) {
                  <li>{{ c.titulo }} <span class="meta">· {{ c.itens }} item(ns)</span></li>
                }</ul>
              </div>
            } @empty { <p class="muted">Não encontramos instituições com campanhas abertas.</p> }
          }
        </section>
        <details class="accordion" id="cadastrar"><summary>Cadastrar minha instituição</summary>
          <div class="acc-body">
            <form #cad (submit)="$event.preventDefault(); cadastrar(cad)">
              <label>Nome da instituição <input name="nome" required maxlength="160"></label>
              <label>Contato da instituição <input name="contato" maxlength="255"></label>
              <label>Seu nome <input name="resp_nome" required maxlength="160"></label>
              <label>Seu contato <input name="resp_contato" required maxlength="255"></label>
              <label class="check"><input type="checkbox" name="consentimento" required> Concordo com o uso dos dados informados para avaliar e entrar em contato sobre o cadastro (LGPD). <a class="link" href="#privacidade" (click)="abrirPrivacidade()">Ver política</a></label>
              <button [disabled]="ocupado()">Enviar cadastro</button>
            </form>
          </div>
        </details>
        <details class="accordion" id="privacidade"><summary>Privacidade e uso de dados (LGPD)</summary>
          <div class="acc-body politica">
            <p>O Elo Brasil Solidário trata dados pessoais conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018), coletando apenas o necessário para intermediar doações.</p>
            <h4>Quais dados coletamos</h4>
            <ul>
              <li><strong>Doação:</strong> nome, contato e quantidade oferecida; opcionalmente, o nome da empresa que você representa.</li>
              <li><strong>Cadastro de instituição:</strong> nome e contato da instituição e do responsável.</li>
            </ul>
            <h4>Para que usamos</h4>
            <p>Para a instituição combinar a entrega com você e confirmar o recebimento, e para avaliar e aprovar novas instituições. Não vendemos nem compartilhamos dados com terceiros para outras finalidades.</p>
            <h4>Quem vê seus dados</h4>
            <p>Seu nome e contato ficam visíveis apenas para a instituição que recebe a sua doação. Publicamente, aparece somente o nome da empresa (se informado) no ranking e no mural — nunca valores ou quantidades.</p>
            <h4>Por quanto tempo</h4>
            <p>Mantemos os dados enquanto forem necessários para a campanha e para o histórico de reconhecimento das empresas.</p>
            <h4>Seus direitos</h4>
            <p>Você pode pedir acesso, correção ou exclusão dos seus dados pelo contato da instituição para a qual doou ou pela coordenação do projeto Elo Brasil Solidário (UNASP).</p>
          </div>
        </details>
        <details class="accordion"><summary>Administração</summary>
          <div class="acc-body">
            @if (instituicoes(); as insts) {
              <div class="row-actions"><button class="ghost" [disabled]="ocupado()" (click)="sairAdmin()">Sair da administração</button></div>
              @if (indicadoresAdmin(); as ind) {
                <div class="stats">
                  <div class="stat"><span class="num">{{ ind.aprovadas }}</span><span class="lbl">Instituições aprovadas</span></div>
                  <div class="stat"><span class="num">{{ ind.pendentes }}</span><span class="lbl">Cadastros pendentes</span></div>
                  <div class="stat"><span class="num">{{ ind.campanhas }}</span><span class="lbl">Campanhas abertas</span></div>
                  <div class="stat"><span class="num">{{ ind.intencoes }}</span><span class="lbl">Intenções de doação</span></div>
                  <div class="stat"><span class="num">{{ ind.recebidas }}</span><span class="lbl">Doações confirmadas</span></div>
                  <div class="stat"><span class="num">{{ ind.empresas }}</span><span class="lbl">Empresas participantes</span></div>
                </div>
              }
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
                      <div class="row-actions">
                        <button [disabled]="ocupado()">Aprovar e gerar código</button>
                        <button type="button" class="ghost perigo" [disabled]="ocupado()" (click)="recusar(i.id, i.nome)">Recusar cadastro</button>
                      </div>
                    </form>
                  }
                </div>
              } @empty { <p class="muted">Nenhuma instituição.</p> }
              <h3>Moderação de campanhas abertas</h3>
              <ul class="dir">@for (c of campanhasAdmin(); track c.id) {
                <li class="need-row"><span>{{ c.titulo }} <span class="meta">· {{ c.instituicao }}</span></span>
                  <button type="button" class="ghost mini perigo" [disabled]="ocupado()" (click)="encerrarAdmin(c.id, c.titulo)">Encerrar</button>
                </li>
              } @empty { <li class="empty">Nenhuma campanha aberta.</li> }</ul>
            } @else {
              <form #adm (submit)="$event.preventDefault(); entrarAdmin(adm)">
                <label>Chave de administrador <input name="codigo" type="password" required autocomplete="current-password"></label>
                <button [disabled]="ocupado()">Entrar</button>
              </form>
            }
          </div>
        </details>
      </main>
      <footer>
        <div class="foot-inner">
          <div><strong>Elo Brasil Solidário</strong><br><span class="meta">Projeto de extensão · UNASP · InovaTec</span></div>
          <nav class="foot-nav" aria-label="Rodapé">
            <a href="#empresas">Empresas</a>
            <a href="#cadastrar">Cadastrar instituição</a>
            <a href="#painel">Área da instituição</a>
            <a href="#explorar">Explorar</a>
            <a href="#privacidade" (click)="abrirPrivacidade()">Privacidade</a>
          </nav>
        </div>
      </footer>
    </div>
  `,
  styles: [`
.vn-elo-mark{position:relative;isolation:isolate}.vn-elo-mark::before,.vn-elo-mark::after{content:'';position:absolute;inset:-5px;border:1px solid #176d83;border-radius:13px;pointer-events:none;animation:vn-elo-connect 3s ease-in-out infinite}.vn-elo-mark::after{animation-delay:-1.5s}@keyframes vn-elo-connect{0%{transform:scale(.95);opacity:.8}100%{transform:scale(1.45);opacity:0}}@media(prefers-reduced-motion:reduce){.vn-elo-mark::before,.vn-elo-mark::after{animation:none}}

    :host{
      --bg:#f7f5f0;--surface:#ffffff;--surface-2:#f2f5f5;
      --line:#dce4e5;--line-2:#9aafb5;
      --text:#20363f;--muted:#52656c;
      --gold:#176d83;--gold-2:#14566a;
      --green:#287e79;--green-2:#235f63;--green-soft:#e0eeec;
      --amber:#865b16;--danger:#9e3936;--radius:6px;
      display:block;color:var(--text);line-height:1.55;
      font-family:'DM Sans',system-ui,sans-serif;
    }
    @keyframes rise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
    .page{min-height:100vh;display:flex;flex-direction:column;
      background:var(--bg);}
    .topbar{position:sticky;top:0;z-index:5;background:rgba(255,255,255,.94);
      backdrop-filter:blur(12px);border-bottom:1px solid var(--line)}
    .topbar .inner{max-width:1440px;margin:0 auto;padding:.8rem 1.25rem;display:flex;align-items:center;gap:.7rem}
    .mark{display:grid;place-items:center;width:36px;height:36px;border-radius:11px;flex:none;
      border:1px solid var(--gold);color:var(--gold);background:#eaf1f2;
      font-family:'Fraunces',Georgia,serif;font-weight:600;font-size:1.15rem}
    .brand{font-weight:700;letter-spacing:.2px;line-height:1.1}
    .brand small{display:block;font-weight:500;font-size:.68rem;color:var(--muted);
      letter-spacing:.16em;text-transform:uppercase}
    .nav{margin-left:auto;display:flex;gap:1.1rem;align-items:center}
    .nav a{color:var(--muted);text-decoration:none;font-size:.9rem;font-weight:500;transition:color .15s}
    .nav a:hover{color:var(--green-2)}
    [id]{scroll-margin-top:74px}
    @media (max-width:560px){
      .topbar .inner{flex-wrap:wrap}
      .nav{margin-left:0;width:100%;gap:1.2rem;font-size:.9rem}
      .brand small{display:none}
    }
    main{width:100%;max-width:1440px;margin:0 auto;padding:1rem 1.25rem 3.5rem;box-sizing:border-box;flex:1}
    .toast{position:fixed;left:50%;bottom:1.2rem;transform:translateX(-50%);z-index:30;
      width:min(560px,calc(100% - 2rem));box-sizing:border-box;margin:0;padding:.8rem 1rem;
      display:flex;align-items:flex-start;gap:.75rem;border-radius:14px;font-weight:500;
      background:#e4f1ee;border:1px solid #9abdb5;color:#245850;
      box-shadow:0 14px 36px rgba(32,54,63,.15)}
    .toast.erro{background:#fae9e7;border-color:#d7a19b;color:#8e302e}
    .toast .fechar{margin-left:auto;background:none;box-shadow:none;color:inherit;padding:0 .25rem;
      font-size:1.25rem;line-height:1;border-radius:6px}
    .toast .fechar:hover:not(:disabled){filter:none;background:rgba(32,54,63,.07)}
    .pular{position:absolute;left:1rem;top:-3rem;z-index:40;background:var(--surface);color:var(--text);
      padding:.5rem .9rem;border-radius:10px;border:1px solid var(--line-2);text-decoration:none}
    .pular:focus{top:.6rem}
    .hero{padding:1.8rem 0 .5rem}
    .banner{position:relative;border-radius:22px;overflow:hidden;border:1px solid var(--line);
      min-height:300px;display:flex;align-items:flex-end;animation:rise .55s ease both;
      box-shadow:0 22px 50px rgba(32,54,63,.10)}
    .banner-art{position:absolute;inset:0;width:100%;height:100%}
    .banner-text{position:relative;width:100%;padding:1.7rem 1.7rem 1.9rem;box-sizing:border-box;
      background:linear-gradient(to top, rgba(247,245,240,.98) 12%, rgba(247,245,240,.88) 48%, rgba(247,245,240,.12) 100%)}
    .banner-text .lede{max-width:48ch}
    @media (max-width:560px){ .banner{min-height:240px} .banner-text{padding:1.3rem 1.2rem 1.4rem} }
    .como{display:grid;grid-template-columns:repeat(3,1fr);gap:.8rem;margin:.4rem 0 .6rem}
    .passo{display:flex;gap:.7rem;background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:1rem;animation:rise .5s ease both}
    .passo .pn{flex:none;display:grid;place-items:center;width:30px;height:30px;border-radius:9px;
      background:var(--green-soft);color:var(--green-2);font-weight:700;font-family:'Fraunces',Georgia,serif}
    .passo strong{display:block;margin-bottom:.15rem}
    .passo .meta{margin:0}
    @media (max-width:720px){ .como{grid-template-columns:1fr} }
    .eyebrow{font-size:.74rem;letter-spacing:.2em;text-transform:uppercase;color:var(--green-2);font-weight:600;margin:0 0 .55rem}
    h1{font-family:'Fraunces',Georgia,serif;font-weight:500;font-size:clamp(2.1rem,6.5vw,3.4rem);
      line-height:1.04;letter-spacing:-.01em;margin:.1rem 0 .55rem}
    .lede{color:var(--muted);max-width:54ch;font-size:1.06rem;margin:0}
    .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:.7rem;margin:1.5rem 0 .3rem}
    .stat{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:.9rem 1rem;animation:rise .5s ease both}
    .stat .num{display:block;font-family:'Fraunces',Georgia,serif;font-weight:600;font-size:1.75rem;line-height:1;color:var(--green-2)}
    .stat .lbl{display:block;margin-top:.35rem;font-size:.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:.09em}
    @media (max-width:560px){ .stats{gap:.5rem} .stat{padding:.7rem .75rem} .stat .num{font-size:1.4rem} }
    .card{background:linear-gradient(180deg,var(--surface),#fafcfc);border:1px solid var(--line);
      border-radius:var(--radius);padding:1.3rem;margin:1.1rem 0;
      transition:transform .2s ease,border-color .2s ease,box-shadow .2s ease;animation:rise .5s ease both}
    .card:hover{transform:translateY(-2px);border-color:var(--line-2);box-shadow:0 18px 40px rgba(32,54,63,.10)}
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
      padding:.62rem 1.2rem;background:linear-gradient(135deg,var(--gold),#14566a);color:#ffffff;transition:.15s;
      display:inline-flex;align-items:center;gap:.4rem;box-shadow:0 6px 18px rgba(23,109,131,.15)}
    button:hover:not(:disabled){filter:brightness(1.08)}
    button:disabled{opacity:.5;cursor:not-allowed}
    button.ghost{background:#ffffff;color:var(--text);border:1px solid var(--line-2)}
    button.ghost:hover:not(:disabled){background:#edf3f3}
    .row-actions{display:flex;gap:.6rem;flex-wrap:wrap;margin:.7rem 0}
    label{display:block;margin:.6rem 0;color:var(--muted);font-size:.9rem}
    input,textarea{display:block;width:100%;box-sizing:border-box;margin-top:.3rem;
      background:#ffffff;color:var(--text);border:1px solid var(--line-2);border-radius:12px;
      padding:.62rem .78rem;font:inherit;transition:border-color .15s,box-shadow .15s}
    input::placeholder{color:#62767d}
    input[type=checkbox]{width:auto;display:inline-block;margin:0 .45rem 0 0;vertical-align:middle;accent-color:var(--gold)}
    label.check{display:flex;align-items:center;color:var(--text);font-size:.92rem;margin:.8rem 0}
    input:focus,textarea:focus{outline:0;border-color:var(--green);box-shadow:0 0 0 3px var(--green-soft)}
    textarea{min-height:92px;resize:vertical}
    fieldset{border:1px dashed var(--line-2);border-radius:12px;padding:.4rem .85rem .7rem;margin:.65rem 0}
    form{margin:.5rem 0}
    .search{display:flex;gap:.5rem;align-items:center}
    .search input{flex:1;margin-top:0;background-color:#ffffff;
      background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%2362767d' stroke-width='2' stroke-linecap='round' viewBox='0 0 24 24'%3E%3Ccircle cx='11' cy='11' r='7'/%3E%3Cpath d='M20 20l-3.5-3.5'/%3E%3C/svg%3E");
      background-repeat:no-repeat;background-position:.75rem center;padding-left:2.2rem}
    .search button{flex:none}
    .badge{display:inline-block;padding:.22rem .66rem;border-radius:999px;font-size:.76rem;font-weight:600}
    .badge.ok{background:var(--green-soft);color:var(--green-2)}
    .badge.warn{background:#f7ecd7;color:var(--amber)}
    .badge.off{background:#f9e8e6;color:var(--danger)}
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
    .bar{height:7px;border-radius:999px;background:#dfe8e8;overflow:hidden;margin:.55rem 0 .15rem}
    .bar>span{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#287e79,var(--gold));transition:width .5s ease}
    .selos{display:inline-flex;gap:.35rem;flex-wrap:wrap;margin-top:.35rem}
    .selo{font-size:.7rem;font-weight:600;padding:.14rem .55rem;border-radius:999px;background:var(--green-soft);color:var(--green-2)}
    .rank-name .selos{display:flex;margin-top:.3rem}
    .ranking-head{margin-top:1.5rem}
    .ranking-head h3{margin:0}
    .sel{font:inherit;font-size:.85rem;color:var(--text);background:#ffffff;border:1px solid var(--line-2);
      border-radius:999px;padding:.35rem .8rem;cursor:pointer}
    .sel:focus-visible{outline:2px solid var(--green);outline-offset:2px}
    .link{color:var(--green-2);text-decoration:none;font-weight:600;font-size:.9rem}
    .link:hover{text-decoration:underline}
    label.check .link{margin-left:.35rem;font-size:.85rem}
    .nota{margin:-.2rem 0 .4rem;font-size:.8rem}
    .politica h4{margin:1rem 0 .2rem;font-size:1.02rem}
    .politica ul{margin:.3rem 0;padding-left:1.1rem;color:var(--muted)}
    .politica p{color:var(--muted)}
    .filtros{display:flex;gap:.4rem;flex-wrap:wrap;margin:.4rem 0 .6rem}
    .filtros button{padding:.4rem .9rem;font-size:.85rem;box-shadow:none}
    button.mini{padding:.3rem .75rem;font-size:.8rem;box-shadow:none}
    button.perigo{color:var(--danger);border-color:#d7a19b}
    button.perigo:hover:not(:disabled){background:#fae9e7}
    .filtros button.ativo{background:var(--green-soft);color:var(--green-2);border-color:#93b8b6}
    .skel{position:relative;overflow:hidden;background:var(--surface-2);border:1px solid var(--line);border-radius:12px}
    .skel::after{content:'';position:absolute;inset:0;transform:translateX(-100%);
      background:linear-gradient(90deg,transparent,rgba(255,255,255,.75),transparent);animation:shimmer 1.3s infinite}
    @keyframes shimmer{100%{transform:translateX(100%)}}
    .sk-banner{height:300px;border-radius:22px;margin-top:.4rem}
    .sk-stat{height:88px}
    .sk-line{height:16px;margin:.7rem 0}
    .sk-line-lg{height:30px;width:55%}
    .sk-row{height:46px;margin:.5rem 0}
    .codebox{font-family:ui-monospace,'Cascadia Code',monospace;word-break:break-all;
      background:#eaf1f2;border:1px dashed var(--gold);border-radius:12px;padding:.7rem .85rem;color:var(--gold-2)}
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
    footer{border-top:1px solid var(--line);color:var(--muted);font-size:.86rem;padding:1.8rem 1.25rem;margin-top:1rem}
    .foot-inner{max-width:1440px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap}
    .foot-nav{display:flex;gap:1.1rem;flex-wrap:wrap}
    .foot-nav a{color:var(--muted);text-decoration:none}
    .foot-nav a:hover{color:var(--green-2)}
    @media (max-width:560px){ main{padding:1rem 1rem 3rem} .card{padding:1.1rem} }
    a:focus-visible,button:focus-visible,summary:focus-visible,input:focus-visible,textarea:focus-visible{
      outline:2px solid var(--green);outline-offset:2px}
    @media (prefers-reduced-motion:reduce){ .card,.hero,.banner,.stat,.passo{animation:none} .card:hover{transform:none} .skel::after{animation:none} }

    /* Conteúdo público e navegação */
    .topbar{background:var(--surface);backdrop-filter:none}
    .topbar .inner,main,.foot-inner{padding-inline:clamp(1rem,3vw,3rem);box-sizing:border-box}
    .topbar .inner{min-height:58px}
    .mark{border-radius:4px;background:transparent}
    .brand{letter-spacing:0}
    main{padding-top:1.4rem}
    .institution-head{padding:0 0 1.4rem}
    .institution-head h1{font-size:clamp(1.85rem,3vw,2.65rem);line-height:1.15;overflow-wrap:anywhere;margin:0 0 .4rem}
    .institution-info{font-size:.9rem;color:var(--muted);margin:0}
    .institution-info span{margin:0 .35rem}
    .campaign-list{min-width:0;padding:0 0 1.2rem}
    .section-heading{font-size:1.45rem;margin:0 0 .3rem}
    .delivery-note{color:var(--muted);font-size:.95rem;max-width:80ch;margin:0 0 1rem}
    .campaign{padding:1.15rem 1.4rem;background:var(--surface);border-radius:4px;margin:0 0 .85rem}
    .campaign h3{font-family:'Fraunces',Georgia,serif;font-size:1.3rem;color:var(--text);letter-spacing:0;text-transform:none;margin:0 0 .2rem}
    .campaign .needs{margin:1rem 0 0;gap:0}
    .campaign .needs>li{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.75rem 2rem;align-items:center;border:0;padding:.65rem 0}
    .campaign .needs>li+li{border-top:1px solid var(--line)}
    .item-info{min-width:0}
    .campaign .donation-form{margin:0}
    .campaign .donation-form>summary{display:inline-flex;align-items:center;background:var(--gold-2);color:#fff;border-radius:4px;padding:.6rem 1rem;white-space:nowrap}
    .campaign .donation-form>summary::before{content:none}
    .campaign .donation-form[open]>summary{background:var(--surface-2);color:var(--green-2)}
    .campaign .needs>li:has(.donation-form[open]){grid-template-columns:1fr}
    .campaign .donation-form form{max-width:620px;margin-top:1rem}
    main>.card{background:transparent;border:0;border-radius:0;padding:1.2rem 0;margin:1.2rem 0;box-shadow:none;animation:none;transition:none}
    .card:hover{transform:none;box-shadow:none}
    main>.card>form:not(.search){max-width:580px}
    .subcard,ul.needs>li,ul.dir>li,ol.rank>li{border:0;border-bottom:1px solid var(--line);border-radius:0;background:transparent;padding:.8rem 0}
    .stat{background:transparent;border:0;border-radius:0;animation:none}
    .stat .lbl,h3,.eyebrow{letter-spacing:0;text-transform:none}
    h3{font-size:1rem}
    button,.btn{background:var(--gold-2);border-radius:4px;box-shadow:none}
    input,textarea,.sel,fieldset{border-radius:4px}
    .bar,.bar>span{border-radius:2px}
    .bar>span{background:var(--green)}
    .banner,.passo,.stat{animation:none}
    .toast{box-shadow:none;border-radius:4px}
    .sk-banner{height:100px;border-radius:4px}
    .skel::after{animation:none}
    .search input{min-width:0}
    .search{max-width:720px}
    details.accordion{background:transparent;border:0;border-radius:0;margin:.5rem 0}
    details.accordion>summary{padding:.8rem 0}
    .acc-body{padding:.5rem 0 1rem}
    @media(max-width:760px){
      .institution-head{padding:0 0 1rem}
      .campaign{padding:1rem}
      .campaign .needs>li{grid-template-columns:1fr;gap:.6rem}
      .topbar .inner{flex-wrap:wrap;gap:.5rem}
      .nav{margin-left:0;width:100%;flex-wrap:wrap;gap:.5rem 1rem}
      .stats{grid-template-columns:repeat(auto-fit,minmax(105px,1fr))}
      label.check{display:block}
    }
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

  pct(item: Item) { return item.meta ? Math.min(100, Math.round((item.recebido ?? 0) / item.meta * 100)) : 0; }
  readonly instituicoes = signal<InstAdmin[] | null>(null);
  readonly codigoGerado = signal('');
  readonly ranking = signal<RankItem[]>([]);
  readonly empresas = signal<Empresa[]>([]);
  readonly carregandoCatalogo = signal(true);
  readonly carregandoEmpresas = signal(true);
  readonly instituicoesPublicas = signal<InstPublica[]>([]);
  readonly carregandoExplorar = signal(true);
  readonly filtroDoacoes = signal<'todas' | 'pendentes' | 'recebidas'>('todas');
  readonly doacoesFiltradas = computed(() => {
    const lista = this.doacoes() ?? [];
    const filtro = this.filtroDoacoes();
    return filtro === 'todas' ? lista : lista.filter(d => (filtro === 'recebidas') === !!d.recebida);
  });
  readonly resumoPainel = computed(() => {
    const lista = this.doacoes() ?? [];
    const recebidas = lista.filter(d => d.recebida).length;
    return {
      campanhas: (this.campanhas() ?? []).filter(c => c.publicada && !c.encerrada).length,
      intencoes: lista.length, recebidas, pendentes: lista.length - recebidas
    };
  });
  readonly retorno = signal('');
  readonly retornoErro = signal(false);
  readonly ocupado = signal(false);
  readonly indicadoresAdmin = signal<IndicAdmin | null>(null);
  readonly campanhasAdmin = signal<CampanhaAdmin[]>([]);
  readonly responsaveisPainel = signal<Responsavel[]>([]);
  readonly opcoesTrimestre = computed<OpcaoTrimestre[]>(() => {
    const periodos = ['jan–mar', 'abr–jun', 'jul–set', 'out–dez'];
    const agora = new Date();
    let ano = agora.getFullYear();
    let tri = Math.floor(agora.getMonth() / 3) + 1;
    const opcoes: OpcaoTrimestre[] = [];
    for (let i = 0; i < 4; i++) {
      opcoes.push({ chave: ano + '-' + tri, ano, tri, rotulo: periodos[tri - 1] + ' ' + ano + (i === 0 ? ' (atual)' : '') });
      tri -= 1;
      if (tri === 0) { tri = 4; ano -= 1; }
    }
    return opcoes;
  });
  readonly trimestreSel = signal(this.opcoesTrimestre()[0].chave);

  doar(item: number, form: HTMLFormElement) {
    const dados = new FormData(form);
    void this.acao('/api/doacoes', {
      item, nome: dados.get('nome'), contato: dados.get('contato'),
      empresa: dados.get('empresa'), quantidade: Number(dados.get('quantidade')),
      consentimento: dados.get('consentimento') != null
    }, async () => {
      form.reset();
      this.retorno.set('Doação informada. A instituição entrará em contato para combinar a entrega.');
    });
  }

  entrar(form: HTMLFormElement) {
    void this.acao('/api/painel/entrar', { codigo: new FormData(form).get('codigo') }, async () => {
      form.reset();
      await this.carregarPainel();
    });
  }

  sair() {
    void this.acao('/api/painel/sair', {}, async () => {
      this.doacoes.set(null); this.campanhas.set(null); this.responsaveisPainel.set([]);
    });
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
    const publicar = dados.get('publicar') != null;
    void this.acao('/api/painel/campanhas', {
      titulo: dados.get('titulo'), descricao: dados.get('descricao'), itens, publicar
    }, async () => {
      form.reset();
      this.linhas.set(1);
      await this.carregarCampanhas();
      this.retorno.set(publicar ? 'Campanha publicada.' : 'Rascunho salvo.');
    });
  }

  encerrar(id: number) {
    void this.acao('/api/painel/campanhas/encerrar', { id }, async () => {
      await this.carregarCampanhas();
      this.retorno.set('Campanha encerrada.');
    });
  }

  publicar(id: number) {
    void this.acao('/api/painel/campanhas/publicar', { id }, async () => {
      await this.carregarCampanhas();
      this.retorno.set('Campanha publicada.');
    });
  }

  editarCampanha(id: number, form: HTMLFormElement) {
    const dados = new FormData(form);
    void this.acao('/api/painel/campanhas/editar',
      { id, titulo: dados.get('titulo'), descricao: dados.get('descricao') }, async () => {
      await this.carregarCampanhas();
      this.retorno.set('Campanha atualizada.');
    });
  }

  private async carregarPainel() {
    this.doacoes.set(await firstValueFrom(this.http.get<Doacao[]>('/api/painel/doacoes')));
    await this.carregarCampanhas();
    await this.carregarResponsaveis();
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

  selosDe(nome: string) { return this.empresas().find(e => e.nome === nome)?.selos ?? []; }

  abrirPrivacidade() { document.getElementById('privacidade')?.setAttribute('open', ''); }

  mudarTrimestre(chave: string) {
    const opcao = this.opcoesTrimestre().find(op => op.chave === chave);
    if (!opcao) return;
    this.trimestreSel.set(chave);
    this.http.get<RankItem[]>('/api/ranking', { params: { ano: opcao.ano, tri: opcao.tri } }).subscribe({
      next: dados => this.ranking.set(dados), error: () => this.ranking.set([])
    });
  }

  explorar(form?: HTMLFormElement) {
    const q = form ? String(new FormData(form).get('q') ?? '') : '';
    this.http.get<InstPublica[]>('/api/explorar', { params: { q } }).subscribe({
      next: dados => { this.instituicoesPublicas.set(dados); this.carregandoExplorar.set(false); },
      error: () => this.carregandoExplorar.set(false)
    });
  }

  exportarCsv() {
    const celula = (valor: unknown) => {
      let texto = String(valor ?? '');
      if (/^[=+\-@\t\r]/.test(texto)) texto = "'" + texto;
      return '"' + texto.replace(/"/g, '""') + '"';
    };
    const linhas = [['Campanha', 'Item', 'Quantidade', 'Nome', 'Contato', 'Situação']]
      .concat((this.doacoes() ?? []).map(d => [d.campanha, d.item, String(d.quantidade), d.nome, d.contato,
        d.recebida ? 'Recebida' : 'Pendente']));
    const csv = '﻿' + linhas.map(l => l.map(celula).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'intencoes-de-doacao.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  private carregarEmpresas() {
    this.http.get<RankItem[]>('/api/ranking').subscribe({ next: dados => this.ranking.set(dados), error: () => {} });
    this.http.get<Empresa[]>('/api/empresas').subscribe({
      next: dados => { this.empresas.set(dados); this.carregandoEmpresas.set(false); },
      error: () => this.carregandoEmpresas.set(false)
    });
  }

  cadastrar(form: HTMLFormElement) {
    const dados = new FormData(form);
    void this.acao('/api/cadastro', {
      nome: dados.get('nome'), contato: dados.get('contato'),
      responsavel: { nome: dados.get('resp_nome'), contato: dados.get('resp_contato') },
      consentimento: dados.get('consentimento') != null
    }, async () => {
      form.reset();
      this.retorno.set('Cadastro enviado. A plataforma vai avaliar e entrar em contato.');
    });
  }

  entrarAdmin(form: HTMLFormElement) {
    const codigo = new FormData(form).get('codigo');
    this.ocupado.set(true);
    this.retorno.set('');
    this.retornoErro.set(false);
    void firstValueFrom(this.http.post('/api/admin/entrar', { codigo }))
      .then(() => { form.reset(); return this.carregarAdmin(); })
      .catch((erro: unknown) => this.tratarErro(erro))
      .finally(() => this.ocupado.set(false));
  }

  sairAdmin() {
    void this.acao('/api/admin/sair', {}, async () => {
      this.instituicoes.set(null); this.indicadoresAdmin.set(null); this.codigoGerado.set('');
    });
  }

  aprovar(id: number, form: HTMLFormElement) {
    void this.acaoCodigo('/api/admin/aprovar', { id, hostname: new FormData(form).get('hostname') }, 'Instituição aprovada.');
  }

  regerar(id: number) {
    void this.acaoCodigo('/api/admin/codigo', { id }, 'Novo código gerado.');
  }

  private async carregarAdmin() {
    this.instituicoes.set(await firstValueFrom(this.http.get<InstAdmin[]>('/api/admin/instituicoes')));
    this.indicadoresAdmin.set(await firstValueFrom(this.http.get<IndicAdmin>('/api/admin/indicadores')));
    this.campanhasAdmin.set(await firstValueFrom(this.http.get<CampanhaAdmin[]>('/api/admin/campanhas')));
  }

  recusar(id: number, nome: string) {
    if (!confirm('Recusar e apagar o cadastro pendente de "' + nome + '"? Esta ação não pode ser desfeita.')) return;
    void this.acaoAdmin('/api/admin/recusar', { id }, 'Cadastro recusado.');
  }

  encerrarAdmin(id: number, titulo: string) {
    if (!confirm('Encerrar a campanha "' + titulo + '"? Ela deixará de aparecer para os doadores.')) return;
    void this.acaoAdmin('/api/admin/campanhas/encerrar', { id }, 'Campanha encerrada pela administração.');
  }

  private async acaoAdmin(path: string, dados: object, msg: string) {
    this.ocupado.set(true);
    this.retorno.set('');
    this.retornoErro.set(false);
    try {
      await firstValueFrom(this.http.post(path, dados));
      await this.carregarAdmin();
      this.retorno.set(msg);
    } catch (erro: unknown) {
      if (erro instanceof HttpErrorResponse && erro.status === 401) this.instituicoes.set(null);
      this.tratarErro(erro);
    } finally {
      this.ocupado.set(false);
    }
  }

  adicionarResponsavel(form: HTMLFormElement) {
    const dados = new FormData(form);
    void this.acao('/api/painel/responsaveis', { nome: dados.get('nome'), contato: dados.get('contato') }, async () => {
      form.reset();
      await this.carregarResponsaveis();
      this.retorno.set('Responsável adicionado.');
    });
  }

  removerResponsavel(id: number, nome: string) {
    if (!confirm('Remover ' + nome + ' dos responsáveis?')) return;
    void this.acao('/api/painel/responsaveis/remover', { id }, async () => {
      await this.carregarResponsaveis();
      this.retorno.set('Responsável removido.');
    });
  }

  private async carregarResponsaveis() {
    this.responsaveisPainel.set(await firstValueFrom(this.http.get<Responsavel[]>('/api/painel/responsaveis')));
  }

  private async acaoCodigo(path: string, dados: object, msg: string) {
    this.ocupado.set(true);
    this.retorno.set('');
    this.retornoErro.set(false);
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
    this.retornoErro.set(true);
    this.retorno.set(erro instanceof HttpErrorResponse && typeof erro.error?.erro === 'string'
      ? erro.error.erro : 'Não foi possível concluir a solicitação.');
  }

  private async acao(path: string, dados: object, sucesso: () => Promise<void>) {
    this.ocupado.set(true);
    this.retorno.set('');
    this.retornoErro.set(false);
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
    let temporizador: ReturnType<typeof setTimeout> | undefined;
    effect(() => {
      const mensagem = this.retorno();
      const erro = this.retornoErro();
      clearTimeout(temporizador);
      if (mensagem) temporizador = setTimeout(() => this.retorno.set(''), erro ? 9000 : 6000);
    });
    this.carregarEmpresas();
    this.explorar();
    void this.carregarPainel().catch(() => {});
    this.http.get<Catalogo>('/api/campanhas').subscribe({
      next: dados => { this.catalogo.set(dados); this.carregandoCatalogo.set(false); document.title = dados.instituicao + ' · Elo Brasil Solidário'; },
      error: erro => { this.carregandoCatalogo.set(false); this.mensagem.set(erro.status === 404
        ? 'Instituição indisponível neste endereço.' : 'Não foi possível carregar as campanhas.'); }
    });
  }
}

bootstrapApplication(App, { providers: [provideHttpClient(), provideZonelessChangeDetection()] });

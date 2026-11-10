import { Component, inject, signal, computed, provideZonelessChangeDetection } from '@angular/core';
import { HttpClient, HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { bootstrapApplication } from '@angular/platform-browser';

import { firstValueFrom } from 'rxjs';

interface Doacao { id: number; nome: string; contato: string; quantidade: number; recebida: number; item: string; campanha: string }
interface Item { id: number; nome: string; unidade: string; meta: number }
interface Campanha { id: number; titulo: string; descricao: string; itens: Item[] }
interface CampanhaPainel { id: number; titulo: string; descricao: string; publicada: boolean; encerrada: boolean; itens: Item[] }
interface Catalogo { instituicao: string; campanhas: Campanha[] }

@Component({
  selector: 'elo-app',
  template: `
    <main>
      <p>Elo Brasil Solidário</p><p role="status">{{ retorno() }}</p>
      @if (catalogo(); as dados) {
        <h1>{{ dados.instituicao }}</h1>
        @for (campanha of dados.campanhas; track campanha.id) {
          <article>
            <h2>{{ campanha.titulo }}</h2><p>{{ campanha.descricao }}</p>
            <ul>@for (item of campanha.itens; track item.id) {
              <li>{{ item.nome }} · Meta de {{ item.meta }} {{ item.unidade }}
                <details><summary>Quero doar</summary>
                  <form #form (submit)="$event.preventDefault(); doar(item.id, form)">
                    <label>Nome <input name="nome" required maxlength="160"></label>
                    <label>Contato <input name="contato" required maxlength="255"></label>
                    <label>Quantidade <input name="quantidade" type="number" min="1" max="1000000" required></label>
                    <button [disabled]="ocupado()">Registrar intenção</button>
                  </form>
                </details>
              </li>
            }</ul>
          </article>
        } @empty { <p>Nenhuma campanha aberta.</p> }
        <section>
          <h2>Painel da instituição</h2>
          @if (doacoes(); as lista) {
            <button [disabled]="ocupado()" (click)="sair()">Sair</button>
            <h3>Campanhas</h3>
            @if (campanhas(); as cs) {
              @for (c of cs; track c.id) {
                <article>
                  <h4>{{ c.titulo }}</h4><p>{{ c.descricao }}</p>
                  <ul>@for (item of c.itens; track item.id) {
                    <li>{{ item.nome }} · Meta de {{ item.meta }} {{ item.unidade }}</li>
                  }</ul>
                  <p>{{ c.encerrada ? 'Encerrada' : (c.publicada ? 'Publicada' : 'Rascunho') }}</p>
                  @if (c.publicada && !c.encerrada) {
                    <button [disabled]="ocupado()" (click)="encerrar(c.id)">Encerrar campanha</button>
                  }
                </article>
              } @empty { <p>Nenhuma campanha cadastrada.</p> }
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
                <button type="button" [disabled]="ocupado()" (click)="linhas.set(linhas() + 1)">Adicionar item</button>
                <button [disabled]="ocupado()">Publicar campanha</button>
              </form>
            </details>
            @for (doacao of lista; track doacao.id) {
              <article>
                <h3>{{ doacao.campanha }}</h3>
                <p>{{ doacao.quantidade }} × {{ doacao.item }}</p>
                <p>{{ doacao.nome }} · {{ doacao.contato }}</p>
                @if (doacao.recebida) { <p>Recebida</p> }
                @else {
                  <button [disabled]="ocupado()" (click)="receber(doacao.id)">Confirmar recebimento</button>
                }
              </article>
            } @empty { <p>Nenhuma intenção registrada.</p> }
          } @else {
            <form #login (submit)="$event.preventDefault(); entrar(login)">
              <label>Código da instituição <input name="codigo" type="password" required autocomplete="current-password"></label>
              <button [disabled]="ocupado()">Entrar</button>
            </form>
          }
        </section>
      } @else { <p role="status">{{ mensagem() }}</p> }
    </main>
  `,
  styles: [`main{max-width:760px;margin:auto;padding:2rem;font:1rem system-ui;color:#16372a}
    article{border:1px solid #d4e5db;border-radius:1rem;padding:1rem;margin-block:1rem}`]
})
class App {
  readonly catalogo = signal<Catalogo | null>(null);
  readonly mensagem = signal('Carregando campanhas…');

  private readonly http = inject(HttpClient);
  readonly doacoes = signal<Doacao[] | null>(null);
  readonly campanhas = signal<CampanhaPainel[] | null>(null);
  readonly linhas = signal(1);
  readonly linhasArr = computed(() => Array.from({ length: this.linhas() }, (_, i) => i));
  readonly retorno = signal('');
  readonly ocupado = signal(false);

  doar(item: number, form: HTMLFormElement) {
    const dados = new FormData(form);
    void this.acao('/api/doacoes', {
      item, nome: dados.get('nome'), contato: dados.get('contato'),
      quantidade: Number(dados.get('quantidade'))
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

  private async acao(path: string, dados: object, sucesso: () => Promise<void>) {
    this.ocupado.set(true);
    this.retorno.set('');
    try {
      await firstValueFrom(this.http.post(path, dados));
      await sucesso();
    } catch (erro: unknown) {
      if (erro instanceof HttpErrorResponse && erro.status === 401) this.doacoes.set(null);
      this.retorno.set(erro instanceof HttpErrorResponse && typeof erro.error?.erro === 'string'
        ? erro.error.erro : 'Não foi possível concluir a solicitação.');
    } finally {
      this.ocupado.set(false);
    }
  }

  constructor() {
    void this.carregarPainel().catch(() => {});
    this.http.get<Catalogo>('/api/campanhas').subscribe({
      next: dados => this.catalogo.set(dados),
      error: erro => this.mensagem.set(erro.status === 404
        ? 'Instituição indisponível neste endereço.' : 'Não foi possível carregar as campanhas.')
    });
  }
}

bootstrapApplication(App, { providers: [provideHttpClient(), provideZonelessChangeDetection()] });

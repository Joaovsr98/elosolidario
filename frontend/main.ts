import { Component, inject, signal, provideZonelessChangeDetection } from '@angular/core';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { bootstrapApplication } from '@angular/platform-browser';

interface Item { id: number; nome: string; unidade: string; meta: number }
interface Campanha { id: number; titulo: string; descricao: string; itens: Item[] }
interface Catalogo { instituicao: string; campanhas: Campanha[] }

@Component({
  selector: 'elo-app',
  template: `
    <main>
      <p>Elo Brasil Solidário</p>
      @if (catalogo(); as dados) {
        <h1>{{ dados.instituicao }}</h1>
        @for (campanha of dados.campanhas; track campanha.id) {
          <article>
            <h2>{{ campanha.titulo }}</h2><p>{{ campanha.descricao }}</p>
            <ul>@for (item of campanha.itens; track item.id) {
              <li>{{ item.nome }} · Meta de {{ item.meta }} {{ item.unidade }}</li>
            }</ul>
          </article>
        } @empty { <p>Nenhuma campanha aberta.</p> }
      } @else { <p role="status">{{ mensagem() }}</p> }
    </main>
  `,
  styles: [`main{max-width:760px;margin:auto;padding:2rem;font:1rem system-ui;color:#16372a}
    article{border:1px solid #d4e5db;border-radius:1rem;padding:1rem;margin-block:1rem}`]
})
class App {
  readonly catalogo = signal<Catalogo | null>(null);
  readonly mensagem = signal('Carregando campanhas…');

  constructor() {
    inject(HttpClient).get<Catalogo>('/api/campanhas').subscribe({
      next: dados => this.catalogo.set(dados),
      error: erro => this.mensagem.set(erro.status === 404
        ? 'Instituição indisponível neste endereço.' : 'Não foi possível carregar as campanhas.')
    });
  }
}

bootstrapApplication(App, { providers: [provideHttpClient(), provideZonelessChangeDetection()] });

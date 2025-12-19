import { BibleVersion } from "@/entities/BibleVersion";

export class BibleVersions {
  // prettier-ignore
  public static readonly versions: BibleVersion[] = [
    BibleVersion.from('/assets/versions/ACF.json', 'Almeida Corrigida Fiel', 'ACF', 'Texto bíblico de domínio público. Tradução Almeida Corrigida Fiel.'),
    BibleVersion.from('/assets/versions/ARA.json', 'Almeida Revista e Atualizada', 'ARA', 'Texto bíblico de domínio público. Tradução Almeida Revista e Atualizada.'),
    BibleVersion.from('/assets/versions/ARC.json', 'Almeida Revista e Corrigida', 'ARC', 'Texto bíblico de domínio público. Tradução Almeida Revista e Corrigida.'),
    BibleVersion.from('/assets/versions/AS21.json', 'Almeida Século 21', 'AS21', 'Texto bíblico © Vida Nova. Tradução Almeida Século 21. Todos os direitos reservados.'),
    BibleVersion.from('/assets/versions/JFAA.json', 'João Ferreira de Almeida Atualizada', 'JFAA', 'Texto bíblico de domínio público. Tradução João Ferreira de Almeida Atualizada.'),
    BibleVersion.from('/assets/versions/KJA.json', 'King James Atualizada', 'KJA', 'Texto bíblico © Abba Press. Tradução King James Atualizada. Todos os direitos reservados.'),
    BibleVersion.from('/assets/versions/KJF.json', 'King James Fiel', 'KJF', 'Texto bíblico de domínio público. Tradução King James Fiel.'),
    BibleVersion.from('/assets/versions/NAA.json', 'Nova Almeida Atualizada', 'NAA', 'Texto bíblico © Sociedade Bíblica do Brasil. Nova Almeida Atualizada. Todos os direitos reservados.'),
    BibleVersion.from('/assets/versions/NBV.json', 'Nova Bíblia Viva', 'NBV', 'Texto bíblico © Editora Mundo Cristão. Nova Bíblia Viva. Todos os direitos reservados.'),
    BibleVersion.from('/assets/versions/NTLH.json', 'Nova Tradução na Linguagem de Hoje', 'NTLH', 'Texto bíblico © Sociedade Bíblica do Brasil. Nova Tradução na Linguagem de Hoje. Todos os direitos reservados.'),
    BibleVersion.from('/assets/versions/NVI.json', 'Nova Versão Internacional', 'NVI', 'Texto bíblico © Biblica Inc. Nova Versão Internacional. Todos os direitos reservados.'),
    BibleVersion.from('/assets/versions/NVT.json', 'Nova Versão Transformadora', 'NVT', 'Texto bíblico © Editora Mundo Cristão. Nova Versão Transformadora. Todos os direitos reservados.'),
    BibleVersion.from('/assets/versions/TB.json', 'Tradução Brasileira', 'TB', 'Texto bíblico de domínio público. Tradução Brasileira.'),
    BibleVersion.from('/assets/versions/BLIVRE.json', 'Bíblia Livre', 'BLIVRE', 'Texto bíblico de domínio público. Bíblia Livre (CC BY-SA 4.0).'),
  ];
}
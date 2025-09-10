import { BibleVersion } from "@/types/BibleVersion";

export class BibleVersions {
  // prettier-ignore
  public static readonly versions: BibleVersion[] = [
    BibleVersion.from('/assets/versions/ACF.json', 'Almeida Corrigida Fiel', 'ACF'),
    BibleVersion.from('/assets/versions/ARA.json', 'Almeida Revista e Atualizada', 'ARA'),
    BibleVersion.from('/assets/versions/ARC.json', 'Almeida Revista e Corrigida', 'ARC'),
    BibleVersion.from('/assets/versions/AS21.json', 'Almeida Século 21', 'AS21'),
    BibleVersion.from('/assets/versions/JFAA.json', 'João Ferreira de Almeida Atualizada', 'JFAA'),
    BibleVersion.from('/assets/versions/KJA.json', 'King James Atualizada', 'KJA'),
    BibleVersion.from('/assets/versions/KJF.json', 'King James Fiel', 'KJF'),
    BibleVersion.from('/assets/versions/NAA.json', 'Nova Almeida Atualizada', 'NAA'),
    BibleVersion.from('/assets/versions/NBV.json', 'Nova Bíblia Viva', 'NBV'),
    BibleVersion.from('/assets/versions/NTLH.json', 'Nova Tradução na Linguagem de Hoje', 'NTLH'),
    BibleVersion.from('/assets/versions/NVI.json', 'Nova Versão Internacional', 'NVI'),
    BibleVersion.from('/assets/versions/NVT.json', 'Nova Versão Transformadora', 'NVT'),
    BibleVersion.from('/assets/versions/TB.json', 'Tradução Brasileira', 'TB'),
  ];
}

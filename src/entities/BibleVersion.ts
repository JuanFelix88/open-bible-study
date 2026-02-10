import { Language } from "./Language";

export class BibleVersion {
  public path: string = "";
  public name: string = "";
  public abbreviation: string = "";
  public language: Language = Language.PT_BR;
  public license: string = "";
  public isOriginal: boolean = false;
  public startsIn: number = 0;

  public static from(
    path: string,
    name: string,
    abbr: string,
    license: string = "",
    isOriginal: boolean = false,
    startsIn = 0,
    lang: Language = Language.PT_BR,
  ) {
    return new BibleVersion({
      path,
      name,
      abbreviation: abbr,
      language: lang,
      license,
      isOriginal,
      startsIn,
    });
  }

  public constructor(init?: Partial<BibleVersion>) {
    Object.assign(this, init);
  }

  public toJSON() {
    return {
      name: this.name,
      abbreviation: this.abbreviation,
      language: this.language,
      license: this.license,
      isOriginal: this.isOriginal,
      startsIn: this.startsIn,
    };
  }
}

export type BibleVersionObject = Omit<BibleVersion, "path" | "toJSON">;

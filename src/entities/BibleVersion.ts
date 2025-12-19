import { Language } from "./Language";

export class BibleVersion {
  public path: string = "";
  public name: string = "";
  public abbreviation: string = "";
  public language: Language = Language.PT_BR;
  public license: string = "";

  public static from(path: string, name: string, abbr: string, license?: string) {
    return new BibleVersion({ path, name, abbreviation: abbr, license: license || "" });
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
    };
  }
}

export type BibleVersionObject = Omit<BibleVersion, "path" | "toJSON">;

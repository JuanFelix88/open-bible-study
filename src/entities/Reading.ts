export class Reading {
  public static fromString(readingStr: string): Reading | null {
    const data = JSON.parse(readingStr);

    if (data && data.bookAbbr && data.chapter) {
      return new Reading(
        data.bookAbbr,
        data.chapter,
        data.verse !== undefined ? data.verse : null
      );
    }

    return null;
  }

  public at: Date = new Date();

  public constructor(
    public bookAbbr: string,
    public chapter: number,
    public verse: number | null = null
  ) {}

  public toJSON(): string {
    return JSON.stringify({
      bookAbbr: this.bookAbbr,
      chapter: this.chapter,
      verse: this.verse,
    });
  }
  
}

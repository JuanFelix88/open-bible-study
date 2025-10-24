export class ReadingMarker {
  public static fromString(readingStr: string): ReadingMarker | null {
    return ReadingMarker.fromObject(JSON.parse(readingStr));
  }

  public static fromObject(obj: any): ReadingMarker | null {
    console.log({ obj });
    if (obj && obj.bookAbbr && obj.chapter) {
      const reading = new ReadingMarker(
        obj.name,
        obj.bookAbbr,
        obj.chapter,
        obj.verse !== undefined ? obj.verse : null
      );

      reading.at = obj.at ? new Date(obj.at) : new Date();
      return reading;
    }

    return null;
  }

  public at: Date = new Date();

  public constructor(
    public name: string,
    public bookAbbr: string,
    public chapter: number,
    public verse: number
  ) {}

  public toJSON() {
    return {
      name: this.name,
      bookAbbr: this.bookAbbr,
      chapter: this.chapter,
      verse: this.verse,
      at: this.at.toISOString(),
    };
  }

  public compareTo(
    bookAbbr: string,
    chapter: number | undefined | null,
    verse: number | undefined | null
  ): boolean {
    return (
      this.bookAbbr.toLowerCase() === bookAbbr.toLowerCase() &&
      this.chapter === chapter &&
      this.verse === verse
    );
  }
}

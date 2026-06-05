export interface HeadingMetadataItem {
  verse: number;
  title: string;
}

export interface HeadingMetadata {
  name: string;
  abbrev: string;
  chapters: HeadingMetadataItem[][];
}

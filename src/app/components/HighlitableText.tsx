import { Fragment } from "react";

interface HighlitableTextProps {
  text?: string;
}

interface TextFragment {
  text: string;
  isBold: boolean;
  isItalic: boolean;
  isQuoted: boolean;
  endsWithNewLine: boolean;
}

interface StyleState {
  isBold: boolean;
  isItalic: boolean;
  isQuoted: boolean;
}

function fragmentTexts(
  text: string,
  styles: StyleState = { isBold: false, isItalic: false, isQuoted: false },
): TextFragment[] {
  const frags: TextFragment[] = [];

  const boldParts = text.split("**");
  if (boldParts.length > 1) {
    boldParts.forEach((part, index) => {
      if (part.length === 0) return;
      const isBold = index % 2 === 1;
      const newStyles = { ...styles, isBold: styles.isBold || isBold };
      frags.push(...fragmentTexts(part, newStyles));
    });
    return frags;
  }

  const quoteParts = text.split(/"|“|”/g);
  if (quoteParts.length > 1) {
    quoteParts.forEach((part, index) => {
      if (part.length === 0) return;
      const isQuoted = index % 2 === 1;
      const newStyles = { ...styles, isQuoted: styles.isQuoted || isQuoted };

      if (isQuoted) {
        const innerFrags = fragmentTexts(part, newStyles);
        if (innerFrags.length > 0) {
          innerFrags[0].text = '"' + innerFrags[0].text;
          innerFrags[innerFrags.length - 1].text =
            innerFrags[innerFrags.length - 1].text + '"';
        }
        frags.push(...innerFrags);
      } else {
        frags.push(...fragmentTexts(part, newStyles));
      }
    });
    return frags;
  }

  const italicParts = text.split("*");
  if (italicParts.length > 1) {
    italicParts.forEach((part, index) => {
      if (part.length === 0) return;
      const isItalic = index % 2 === 1;
      const newStyles = { ...styles, isItalic: styles.isItalic || isItalic };
      frags.push(...fragmentTexts(part, newStyles));
    });
    return frags;
  }

  if (text.length > 0) {
    frags.push({
      text,
      isBold: styles.isBold,
      isItalic: styles.isItalic,
      isQuoted: styles.isQuoted,
      endsWithNewLine: text.endsWith("\n"),
    });
  }

  return frags;
}

export default function HighlitableText({ text }: HighlitableTextProps) {
  if (!text) return <span></span>;

  const fragments = fragmentTexts(text);

  return (
    <span>
      {fragments.map((frag, i) => {
        const classNames: string[] = [];

        if (frag.isBold)
          classNames.push(
            "bg-surface-strong",
            "px-0.5",
            "rounded-sm",
            "text-text",
            "font-semibold",
          );
        if (frag.isItalic) classNames.push("italic", "text-text");
        if (frag.isQuoted)
          classNames.push(
            "italic",
            "text-text",
            "bg-surface-strong/70",
            "px-0.5",
            "rounded-sm",
          );

        return (
          <Fragment key={frag.text + i}>
            <span className={classNames.join(" ")}>{frag.text}</span>
            {frag.endsWithNewLine ? <br /> : " "}
          </Fragment>
        );
      })}
    </span>
  );
}

import { BibleVersionsRepository } from "@/repositories/BibleVersionsRepository";
import { FnNormalizer } from "@/utils/FnNormalizer";
import { Params, ParamType } from "@/utils/Params";
import { Metadata } from "next";
import { redirect } from "next/navigation";

type Props = {
  params: Promise<any>;
  searchParams: Promise<any>;
};

export async function generateMetadata({
  searchParams,
}: Props): Promise<Metadata> {
  const searchParamsResolved = await searchParams;
  const [version, versionParamError] = Params.getRequiredParam(
    "version",
    searchParamsResolved as any
  );
  const [abbr, abbrParamError] = Params.getRequiredParam(
    "book",
    searchParamsResolved as any
  );
  const [chapter, chapterParamError] = Params.getRequiredParam(
    "chapter",
    searchParamsResolved as any,
    ParamType.NUMBER
  );
  const [verse, verseParamError] = Params.getRequiredParam(
    "verse",
    searchParamsResolved as any,
    ParamType.NUMBER
  );

  if (versionParamError) {
    return {
      title: "Error: Missing version",
    };
  }

  if (abbrParamError) {
    return {
      title: "Error: Missing abbreviation",
    };
  }

  if (chapterParamError) {
    return {
      title: "Error: Missing chapter",
    };
  }

  if (verseParamError) {
    return {
      title: "Error: Missing verse",
    };
  }

  const chapterPromise = BibleVersionsRepository.getChapterWithVersion(
    version,
    abbr,
    chapter
  );

  const { data: chapterData, error: chapterDataError } =
    await FnNormalizer.getFromPromise(chapterPromise);

  if (chapterDataError) {
    return {
      title: `Error: ${chapterDataError.message}`,
    };
  }

  return {
    title: `${version.toUpperCase()} - ${chapterData?.book.name} ${
      chapterData?.book.chapter.number
    } : ${verse}`,
    description: `Read: ${chapterData.book.chapter.verses
      .at(verse - 1)
      ?.substring(0, 120)}...`,
  } satisfies Metadata;
}

export default async function SharePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParamsResolved = await searchParams;
  const [version, versionParamError] = Params.getRequiredParam(
    "version",
    searchParamsResolved as any
  );
  const [abbr, abbrParamError] = Params.getRequiredParam(
    "book",
    searchParamsResolved as any
  );
  const [chapter, chapterParamError] = Params.getRequiredParam(
    "chapter",
    searchParamsResolved as any,
    ParamType.NUMBER
  );
  const [verse, verseParamError] = Params.getRequiredParam(
    "verse",
    searchParamsResolved as any,
    ParamType.NUMBER
  );

  if (
    versionParamError ||
    abbrParamError ||
    chapterParamError ||
    verseParamError
  ) {
    console.log({
      versionParamError,
      abbrParamError,
      chapterParamError,
      verseParamError,
    });
    return redirect("/");
  }

  redirect(
    `/reader?book=${abbr}&chapter=${chapter}&version=${version}&verse=${verse}`
  );
}

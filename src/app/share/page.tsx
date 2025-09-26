import ProcessRedirectShareLink from "@/components/RedirectsShare";
import { BibleVersionsRepository } from "@/repositories/BibleVersionsRepository";
import { FnNormalizer } from "@/utils/FnNormalizer";
import { Params, ParamType } from "@/utils/Params";
import { Metadata } from "next";

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
      metadataBase: null,
    };
  }

  if (abbrParamError) {
    return {
      title: "Error: Missing abbreviation",
      metadataBase: null,
    };
  }

  if (chapterParamError) {
    return {
      title: "Error: Missing chapter",
      metadataBase: null,
    };
  }

  if (verseParamError) {
    return {
      title: "Error: Missing verse",
      metadataBase: null,
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
      metadataBase: null,
    };
  }

  const title = `${version.toUpperCase()} - ${chapterData?.book.name} ${
    chapterData?.book.chapter.number
  }:${verse}`;
  const description = `Read: ${chapterData.book.chapter.verses
    .at(verse - 1)}`;

  return {
    title: {
      absolute: title,
    },
    description: description,
    metadataBase: null,
    alternates: {},
    openGraph: {},
    twitter: {},
    robots: {},
  } satisfies Metadata;
}

export default async function SharePage() {
  return (
    <div className="flex min-h-screen flex-col px-7 pr-2 py-5 sm:py-7 pb-15 bg-background relative text-text">
      <h1 className="text-2xl sm:text-4xl font-bold text-center">
        Redirecting...
      </h1>
      <p className="mt-4 text-lg text-center">Please wait a moment.</p>
      <p className="mt-4 text-lg text-center">If not redirected, click </p>
      <ProcessRedirectShareLink />
    </div>
  );
}

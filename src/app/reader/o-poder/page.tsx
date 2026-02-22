"use client";
import { ThrowByResponse } from "@/utils/ThrowByResponse";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useInView } from "react-intersection-observer";
import BibleRefText from "../../components/BibleRefText";
import ArrowLeftIcon from "../../components/icons/ArrowLeftIcon";
import ArrowRightIcon from "../../components/icons/ArrowRightIcon";
import HomeIcon from "../../components/icons/HomeIcon";

interface PageResponse {
  title: string;
  totalPages: number;
  page: number;
  content: string;
}

export default function OPoderReader() {
  const { ref: refHeader, inView: inViewHeader } = useInView({});
  const searchParams = useSearchParams();
  const router = useRouter();

  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const [maxReadPage, setMaxReadPage] = useState(currentPage);

  useEffect(() => {
    const stored = parseInt(
      localStorage.getItem("o-poder-progress") || "0",
      10,
    );
    const newMax = Math.max(stored, currentPage);
    setMaxReadPage(newMax);
    localStorage.setItem("o-poder-progress", String(newMax));
  }, [currentPage]);

  const { data, isLoading } = useQuery({
    queryKey: ["o-poder", currentPage],
    queryFn: async () => {
      const res = await fetch(`/api/books/o-poder?page=${currentPage}`);
      await ThrowByResponse.throwsIfNotOk(res);
      return (await res.json()) as PageResponse;
    },
  });

  const goToPage = useCallback(
    (page: number) => {
      router.push(`/reader/o-poder?page=${page}`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [router],
  );

  const handlePreviousPage = useCallback(() => {
    if (currentPage > 1) goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  const handleNextPage = useCallback(() => {
    if (data && currentPage < data.totalPages) goToPage(currentPage + 1);
  }, [currentPage, data, goToPage]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePreviousPage();
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNextPage();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlePreviousPage, handleNextPage]);

  useEffect(() => {
    if (data) {
      document.title = `${data.title} — Página ${currentPage}`;
    }
  }, [data, currentPage]);

  useEffect(() => {
    if (data && currentPage < data.totalPages) {
      router.prefetch(`/reader/o-poder?page=${currentPage + 1}`);
    }
    if (currentPage > 1) {
      router.prefetch(`/reader/o-poder?page=${currentPage - 1}`);
    }
  }, [currentPage, data, router]);

  const paragraphs = data?.content
    ?.split("\n")
    .filter((p) => p.trim().length > 0);

  return (
    <div className="flex min-h-screen flex-col px-7 pr-2 py-5 sm:py-7 pb-16 sm:pb-36 bg-background relative text-text max-w-[750px] w-full">
      {!inViewHeader && (
        <div className="select-none fixed top-0 left-0 w-full bg-background border-b border-border p-6 py-2 z-40 shadow animate-show-from-top">
          <div className="flex items-center max-w-[750px] mx-auto">
            <div className="flex flex-col">
              <h1 className="text-xl sm:text-2xl font-bold -mr-30 sm:-mr-8">
                Livro
              </h1>
              <h2 className="text-sm font-bold text-text/80 max-w-[220px] text-start">
                {data?.title ?? "..."}
              </h2>
              <h3 className="text-xs font-bold text-text/50">
                Página {currentPage}
                {data ? ` de ${data.totalPages}` : ""}
              </h3>
              <ProgressBar current={maxReadPage} total={data?.totalPages} />
            </div>
            <NavigationButtons
              currentPage={currentPage}
              totalPages={data?.totalPages}
              onPrevious={handlePreviousPage}
              onNext={handleNextPage}
            />
          </div>
        </div>
      )}

      <div className="flex items-center select-none">
        <div className="flex flex-col mb-2">
          <h1
            className="text-xl sm:text-2xl font-bold -mr-30 sm:-mr-8"
            ref={refHeader}
          >
            Livro
          </h1>
          <h2 className="text-sm font-bold text-text/80 max-w-[220px] text-start">
            {data?.title ?? "..."}
          </h2>
          <h3 className="text-xs font-bold text-text/50">
            Página {currentPage}
            {data ? ` de ${data.totalPages}` : ""}
          </h3>
          <ProgressBar current={maxReadPage} total={data?.totalPages} />
        </div>
        <NavigationButtons
          currentPage={currentPage}
          totalPages={data?.totalPages}
          onPrevious={handlePreviousPage}
          onNext={handleNextPage}
        />
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2 w-full max-w-[750px] min-w-fit mt-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1 w-full min-w-fit">
              <div className="w-full h-5 rounded-sm bg-surface animate-pulse mb-1" />
              <div className="w-11/12 h-5 rounded-sm bg-surface animate-pulse mb-1" />
              <div className="w-9/12 h-5 rounded-sm bg-surface animate-pulse mb-1" />
            </div>
          ))}
        </div>
      )}

      {paragraphs && (
        <div className="mt-4 flex flex-col gap-1">
          {paragraphs.map((paragraph, i) => (
            <p key={i} className="text-lg leading-relaxed text-text/95">
              <BibleRefText>{paragraph}</BibleRefText>
            </p>
          ))}
        </div>
      )}

      {data && (
        <div className="flex items-center justify-between mt-10 pt-6 border-t border-border/50 mr-4">
          <button
            className="flex items-center gap-1 px-4 py-2 rounded-md bg-surface border border-border hover:bg-surface-strong cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            onClick={handlePreviousPage}
            disabled={currentPage <= 1}
          >
            <ArrowLeftIcon width={20} height={20} />
            Anterior
          </button>
          <span className="text-sm text-text/50">
            {currentPage} / {data.totalPages}
          </span>
          <button
            className="flex items-center gap-1 px-4 py-2 rounded-md bg-surface border border-border hover:bg-surface-strong cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            onClick={handleNextPage}
            disabled={currentPage >= data.totalPages}
          >
            Próxima
            <ArrowRightIcon width={20} height={20} />
          </button>
        </div>
      )}
    </div>
  );
}

function ProgressBar({ current, total }: { current: number; total?: number }) {
  if (!total) return null;
  const percent = Math.min(Math.round((current / total) * 100), 100);

  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="h-1 w-24 sm:w-32 rounded-full bg-surface overflow-hidden">
        <div
          className="h-full rounded-full bg-primary/70 transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-[0.6rem] text-text/40">{percent}%</span>
    </div>
  );
}

function NavigationButtons({
  currentPage,
  totalPages,
  onPrevious,
  onNext,
}: {
  currentPage: number;
  totalPages?: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex ml-auto min-w-[140px] pr-2">
      <a
        href="/"
        className="cursor-pointer ml-4 mt-1.5 p-2 rounded-md hover:bg-surface opacity-80"
      >
        <HomeIcon width={25} height={25} />
      </a>
      <button
        className="cursor-pointer ml-4 mt-1 p-2 rounded-md hover:bg-surface opacity-80 disabled:opacity-30"
        onClick={onPrevious}
        disabled={currentPage <= 1}
      >
        <ArrowLeftIcon width={30} height={30} />
      </button>
      <button
        className="cursor-pointer ml-4 mt-1 p-2 rounded-md hover:bg-surface opacity-80 disabled:opacity-30"
        onClick={onNext}
        disabled={!totalPages || currentPage >= totalPages}
      >
        <ArrowRightIcon width={30} height={30} />
      </button>
    </div>
  );
}

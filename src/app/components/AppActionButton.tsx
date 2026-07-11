import type { ButtonHTMLAttributes, ReactNode } from "react";

type AppActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: ReactNode;
  title: string;
  description?: string;
};

export default function AppActionButton({
  icon,
  title,
  description,
  className = "",
  ...props
}: AppActionButtonProps) {
  return (
    <button
      type="button"
      className={`group flex min-h-16 w-full items-center gap-3 rounded-[18px] px-3 py-2.5 text-left outline-none transition-[background-color,transform] duration-150 hover:bg-background/55 active:scale-[0.985] focus-visible:ring-2 focus-visible:ring-primary/45 cursor-pointer ${className}`}
      {...props}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-text text-background shadow-sm">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold leading-5 text-text">
          {title}
        </span>
        {description && (
          <span className="mt-0.5 block text-[12px] leading-4 text-text-muted">
            {description}
          </span>
        )}
      </span>
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="h-4 w-4 shrink-0 text-text/30 transition-transform duration-150 group-hover:translate-x-0.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m6 3.5 4.5 4.5L6 12.5" />
      </svg>
    </button>
  );
}

import * as React from "react";
import { SVGProps } from "react";

const MusicIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16px"
    height="16px"
    viewBox="0 0 24 24"
    fill="none"
    {...props}
  >
    <path
      d="M9 18.25C9 19.77 7.57 21 5.8 21S2.6 19.77 2.6 18.25 4.03 15.5 5.8 15.5c.72 0 1.38.2 1.9.54V5.8c0-.88.58-1.65 1.42-1.9l9-2.65A1.8 1.8 0 0 1 20.4 3v12.25c0 1.52-1.43 2.75-3.2 2.75S14 16.77 14 15.25s1.43-2.75 3.2-2.75c.72 0 1.38.2 1.9.54V7.35L9 10.32v7.93Z"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M7.7 10.28 20.4 6.55"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
  </svg>
);

export default MusicIcon;

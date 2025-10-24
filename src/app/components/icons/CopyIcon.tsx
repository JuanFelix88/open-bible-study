import * as React from "react";
import { SVGProps } from "react";
const CopyIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    xmlnsXlink="http://www.w3.org/1999/xlink"
    width="16px"
    height="16px"
    viewBox="0,0,256,256"
    {...props}
  >
    <g
      fill="currentColor"
      fillRule="nonzero"
      stroke="none"
      strokeWidth={1}
      strokeLinecap="butt"
      strokeLinejoin="miter"
      strokeMiterlimit={10}
      strokeDasharray=""
      strokeDashoffset={0}
      fontFamily="none"
      fontWeight="none"
      fontSize="none"
      textAnchor="none"
      style={{
        mixBlendMode: "normal",
      }}
    >
      <g transform="scale(16,16)">
        <path d="M4,1v2h-3v12h10v-1h4v-10l-3,-3zM6,3h5v2h2v7h-2h-5zM8,5v2h2.04297v-2zM8,8v2h3v-2z" />
      </g>
    </g>
  </svg>
);
export default CopyIcon;

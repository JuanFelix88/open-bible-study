import * as React from "react";
import { SVGProps } from "react";
const ShareIcon = (props: SVGProps<SVGSVGElement>) => (
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
        <path d="M9,1v3h-1c-4.411,0 -8,3.589 -8,8v2h4v-2c0,-2.206 1.794,-4 4,-4h1v3h2l5,-5l-5,-5z" />
      </g>
    </g>
  </svg>
);
export default ShareIcon;

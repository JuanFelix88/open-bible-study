import * as React from "react";
import { SVGProps } from "react";
const LinkIcon = (props: SVGProps<SVGSVGElement>) => (
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
        <path d="M9,2v1h3.29297l-6.26953,6.27344l0.70313,0.70313l6.27344,-6.26953v3.29297h1v-5zM4,4c-1.10547,0 -2,0.89453 -2,2v6c0,1.10547 0.89453,2 2,2h6c1.10547,0 2,-0.89453 2,-2v-5l-1,1v4c0,0.55078 -0.44922,1 -1,1h-6c-0.55078,0 -1,-0.44922 -1,-1v-6c0,-0.55078 0.44922,-1 1,-1h4l1,-1z" />
      </g>
    </g>
  </svg>
);
export default LinkIcon;

import * as React from "react";
import { SVGProps } from "react";
const CompareIcon = (props: SVGProps<SVGSVGElement>) => (
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
        <path d="M2.283,4l-1.626,-1.627l1.414,-1.414l0.929,0.93l1.755,-1.841l1.414,1.414l-2.462,2.528c-0.558,0.004 -0.866,0.006 -1.424,0.01zM9,2h7v2h-7zM2.283,9l-1.626,-1.627l1.414,-1.414l0.929,0.93l1.755,-1.841l1.414,1.414l-2.462,2.528c-0.558,0.004 -0.866,0.006 -1.424,0.01zM9,7h7v2h-7zM9,12h7v2h-7zM3,11c-1.10457,0 -2,0.89543 -2,2c0,1.10457 0.89543,2 2,2c1.10457,0 2,-0.89543 2,-2c0,-1.10457 -0.89543,-2 -2,-2z" />
      </g>
    </g>
  </svg>
);
export default CompareIcon;

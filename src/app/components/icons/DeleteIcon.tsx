import * as React from "react";
import { SVGProps } from "react";
const DeleteIcon = (props: SVGProps<SVGSVGElement>) => (
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
        <path d="M2.75,2.04297l-0.70703,0.70703l0.35547,0.35156l4.89453,4.89844l-5.25,5.25l0.70703,0.70703l5.25,-5.25l4.89453,4.89844l0.35547,0.35156l0.70703,-0.70703l-0.35156,-0.35547l-4.89844,-4.89453l5.25,-5.25l-0.70703,-0.70703l-5.25,5.25l-4.89844,-4.89453z" />
      </g>
    </g>
  </svg>
);
export default DeleteIcon;

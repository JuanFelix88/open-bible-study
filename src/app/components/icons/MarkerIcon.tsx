import * as React from "react";
import { SVGProps } from "react";
const MarkerIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    xmlnsXlink="http://www.w3.org/1999/xlink"
    width="50px"
    height="50px"
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
      <g transform="scale(5.12,5.12)">
        <path d="M25,1c-5.51562,0 -10,4.48438 -10,10c0,5.51563 4.48438,10 10,10c5.51563,0 10,-4.48437 10,-10c0,-5.51562 -4.48437,-10 -10,-10zM25,5c0.55078,0 1,0.44531 1,1c0,0.55469 -0.44922,1 -1,1c-2.20703,0 -4,1.79297 -4,4c0,0.55469 -0.44922,1 -1,1c-0.55078,0 -1,-0.44531 -1,-1c0,-3.30859 2.69141,-6 6,-6zM22,22.60547v20.64063l3,5.74219l3,-5.74219v-20.64062c-0.96094,0.25 -1.96484,0.39453 -3,0.39453c-1.03516,0 -2.03906,-0.14453 -3,-0.39453z" />
      </g>
    </g>
  </svg>
);
export default MarkerIcon;

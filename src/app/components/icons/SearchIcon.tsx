import * as React from "react";
import { SVGProps } from "react";
const SearchIcon = (props: SVGProps<SVGSVGElement>) => (
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
        <path d="M7,0c-3.866,0 -7,3.134 -7,7c0,3.866 3.134,7 7,7c1.57154,0 3.01727,-0.52403 4.18555,-1.39844l3.21289,3.21289l1.41601,-1.41601l-3.21289,-3.21289c0.87441,-1.16828 1.39844,-2.614 1.39844,-4.18555c0,-3.866 -3.134,-7 -7,-7zM6.5,3c0.89575,0 1.79111,0.34189 2.47461,1.02539l-1.41406,1.41406c-0.586,-0.586 -1.53609,-0.586 -2.12109,0c-0.586,0.586 -0.586,1.53609 0,2.12109l-1.41406,1.41406c-1.367,-1.367 -1.367,-3.58222 0,-4.94922c0.6835,-0.6835 1.57886,-1.02539 2.47461,-1.02539z" />
      </g>
    </g>
  </svg>
);
export default SearchIcon;

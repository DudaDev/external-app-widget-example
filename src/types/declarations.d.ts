// CSS Modules
declare module '*.module.css' {
  const styles: Record<string, string>;
  export default styles;
}

// SVG imported as React components via vite-plugin-svgr
declare module '*.svg?react' {
  import * as React from 'react';
  const SVGComponent: React.FC<React.SVGProps<SVGSVGElement>>;
  export default SVGComponent;
}

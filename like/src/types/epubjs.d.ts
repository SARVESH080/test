declare module "epubjs" {
  // epubjs does not ship type declarations; this app talks to its API
  // through `any`-typed refs (see components/reader/epub-viewer.tsx), so
  // this shim only exists to satisfy TypeScript's module resolution.
  const ePub: any;
  export default ePub;
}

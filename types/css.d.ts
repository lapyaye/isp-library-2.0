// Ambient declaration so side-effect CSS imports (e.g. `import "./globals.css"`)
// always type-check, independent of Next's generated `.next` types or the
// editor's TS-server state.
declare module "*.css";

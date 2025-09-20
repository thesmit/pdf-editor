declare module "*.worker.js?url" {
  const url: string;
  export default url;
}

declare module "*.worker.mjs?url" {
  const url: string;
  export default url;
}

declare module "*.worker.js" {
  const url: string;
  export default url;
}

declare module "*.worker.mjs" {
  const url: string;
  export default url;
}

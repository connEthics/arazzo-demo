declare module 'elkjs/lib/elk-api.js' {
  import ELK from 'elkjs/lib/elk-api';
  export default ELK;
}
declare module 'elkjs/lib/elk-worker.min.js' {
  const mod: { Worker: new () => Worker; default: new () => Worker };
  export = mod;
}

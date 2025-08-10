declare module 'download-git-repo' {
  function download(
    repository: string,
    destination: string,
    callback: (err: Error | null) => void
  ): void;
  
  function download(
    repository: string,
    destination: string,
    options: any,
    callback: (err: Error | null) => void
  ): void;
  
  export = download;
}
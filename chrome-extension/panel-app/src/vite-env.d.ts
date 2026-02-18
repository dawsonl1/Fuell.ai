/// <reference types="vite/client" />

// Allow importing CSS as inline string
declare module '*.css?inline' {
  const content: string;
  export default content;
}

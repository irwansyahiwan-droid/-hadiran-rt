/* Deklarasi tipe untuk `palet.mjs` — dibutuhkan karena `paletMjs.test.ts`
   (TypeScript) mengimpornya untuk mengunci uraian ke modul TS aslinya.
   Bentuknya sengaja dinyatakan di sini, bukan `any`: kalau `palet.mjs`
   berhenti mengekspor salah satunya, typecheck yang memberi tahu. */
export declare const CETAK: Record<string, string> & {
  heroRamp: string[];
  heroScrim: number[];
};
export declare function rgba(hex: string, a: number): string;

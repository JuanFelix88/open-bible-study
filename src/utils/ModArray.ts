import { StaticClass } from '@/types/StaticClass';

export class ModArray extends StaticClass {
  public static findFrom<T>(
    obj: object,
    predicate: (value: T, index: number, array: T[]) => boolean
  ): T | undefined {
    for (const key in obj) {
      const element = (obj as any)[key];
      if (predicate(element, Number(key), Object.values(obj) as T[])) {
        return element;
      }
    }
  }

  public static mapFrom<T, J>(
    obj: object,
    predicate: (value: T, index: number, array: T[]) => J
  ): J[] {
    const out = [] as J[];
    for (const key in obj) {
      const element = (obj as any)[key];
      out.push(predicate(element, Number(key), Object.values(obj) as T[]));
    }
    return out;
  }

  public static indexOfFrom(obj: object, val: object): number {
    for (const key in obj) {
      const element = (obj as any)[key];

      if (element === val) {
        return Number(key);
      }
    }
    return -1;
  }
}

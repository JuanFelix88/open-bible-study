import { StaticClass } from '@/entities/StaticClass';

export class FnNormalizer extends StaticClass {
  public static getFromPromise<T extends Promise<any>>(promise: T): Promise<{ data: Awaited<T>; error: null } | { data: null; error: Error }> {
    return promise
      .then((data) => ({ data, error: null }))
      .catch((error) => ({ data: null, error }));
  }
}
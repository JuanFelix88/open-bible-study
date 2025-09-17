import { StaticClass } from '@/entities/StaticClass';

export class FnNormalizer extends StaticClass {
  public static fun<T extends Promise<any>>(func: T): Promise<{ data: Awaited<T>; error: null } | { data: null; error: Error }> {
    return func
      .then((data) => ({ data, error: null }))
      .catch((error) => ({ data: null, error }));
  }
}
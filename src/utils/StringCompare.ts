import { StaticClass } from "@/entities/StaticClass";

type Primitive = string | number | boolean | null;

export class StringCompare extends StaticClass {
  public static containsIgnoreCaseAndDiacritics(
    a: Primitive,
    b: Primitive
  ): boolean {
    if (!a || !b) return false;

    return a
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .includes(
        b
          .toString()
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
      );
  }

  public static isEqualIgnoreCaseAndDiacritics(
    a: Primitive,
    b: Primitive
  ): boolean {
    if (!a || !b) return false;

    return (
      a
        .toString()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") ===
      b
        .toString()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
    );
  }
}

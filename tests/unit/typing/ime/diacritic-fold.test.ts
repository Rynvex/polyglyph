/**
 * TDD spec for latinFold / germanFold — diacritic strippers used by the
 * compose layer to derive the ASCII typing target from a display
 * carrying proper native spelling.
 */
import { describe, expect, test } from "vitest";
import { germanFold, latinFold } from "@/lib/typing/ime/diacritic-fold";

describe("latinFold — es/it style stripping", () => {
  test.each([
    ["muchísimo", "muchisimo"],
    ["dónde", "donde"],
    ["estás", "estas"],
    ["mañana", "manana"],
    ["¡Conduce!", "¡Conduce!"], // ¡ has no diacritic; preserved
    ["lunedì", "lunedi"],
    ["caffè", "caffe"],
    ["è", "e"],
    ["ñ", "n"],
    ["ABC", "ABC"],
    ["", ""],
  ])("latinFold(%s) === %s", (input, output) => {
    expect(latinFold(input)).toBe(output);
  });
});

describe("germanFold — ä/ö/ü/ß plus residue Latin folding", () => {
  test.each([
    ["fängt", "faengt"],
    ["spät", "spaet"],
    ["für", "fuer"],
    ["übernehmen", "uebernehmen"],
    ["Nächsten", "Naechsten"],
    ["Straße", "Strasse"],
    ["Größe", "Groesse"],
    ["Übung", "Uebung"],
    ["café", "cafe"], // also strips other Latin marks
    ["", ""],
  ])("germanFold(%s) === %s", (input, output) => {
    expect(germanFold(input)).toBe(output);
  });
});

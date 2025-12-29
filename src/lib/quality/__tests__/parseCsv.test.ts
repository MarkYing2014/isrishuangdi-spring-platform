import { describe, it, expect } from "vitest";
import { parseCsv } from "../parseCsv";

describe("parseCsv", () => {
    it("should parse a simple CSV correctly", () => {
        const input = `Name,Age,Role
Alice,30,Engineer
Bob,25,Designer`;

        const result = parseCsv(input);

        expect(result.rawColumns).toEqual(["Name", "Age", "Role"]);
        expect(result.rows.length).toBe(2);

        expect(result.rows[0].Name).toBe("Alice");
        expect(result.rows[0].Age).toBe("30"); // Raw is string
        expect(result.rows[0].__rowId).toBeDefined();

        expect(result.rows[1].Role).toBe("Designer");
        expect(result.rows[1].__rowId).toBeDefined();
        // Ensure unique IDs
        expect(result.rows[0].__rowId).not.toBe(result.rows[1].__rowId);
    });

    it("should handle empty input", () => {
        const result = parseCsv("");
        expect(result.rows.length).toBe(0);
        expect(result.rawColumns.length).toBe(0);
    });
});

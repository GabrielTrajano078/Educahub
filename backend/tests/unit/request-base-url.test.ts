import { describe, expect, it } from "@jest/globals";
import type { Request } from "express";
import { getRequestBaseUrl } from "../../src/lib/request-base-url";

function mockRequest(protocol: string, host: string | undefined): Request {
  return {
    protocol,
    get: (name: string) => (name === "host" ? host : undefined),
  } as Request;
}

describe("getRequestBaseUrl", () => {
  it("monta protocolo e host", () => {
    expect(getRequestBaseUrl(mockRequest("https", "api.example.com"))).toBe("https://api.example.com");
  });

  it("usa localhost quando host ausente", () => {
    expect(getRequestBaseUrl(mockRequest("http", undefined))).toBe("http://localhost");
  });
});
